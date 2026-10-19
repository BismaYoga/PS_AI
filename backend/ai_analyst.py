"""
ai_analyst.py — Generator Ringkasan AI memadukan Analisis Teknikal Chart (MA20, MA50, RSI 14, Support/Resistance)
dan 3 Berita/Katalis Terkini (Google Search) via Gemini AI.
"""

import os
import json
import re
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

from fetch_news import get_news, EMITEN_NAMES, CATEGORY_MAP, get_gemini_api_key

# Cache hasil analisis agar tidak berulang kali memanggil Gemini dalam waktu singkat (TTL: 5 menit)
_analysis_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL = 5 * 60  # 5 menit

def analyze_market_instrument(ticker: str, tech_input: dict = None, force_refresh: bool = False) -> dict:
    """
    Melakukan analisis komprehensif memadukan data teknikal chart dan 3 berita terkini.
    """
    import time
    key = ticker.upper().strip()
    now = time.time()

    if not force_refresh and key in _analysis_cache:
        ts, cached_res = _analysis_cache[key]
        if (now - ts) < CACHE_TTL:
            print(f"[ai_analyst] Menggunakan cache analisis untuk {key}")
            return cached_res

    # 1. Ambil SELURUH berita terkini dari 1 request Invezgo API (atau dari cache jika sudah di-trigger)
    news_items = get_news(key, force_refresh=force_refresh)
    news_summary_list = []
    for n in news_items:
        news_summary_list.append({
            "title": n.get("title", ""),
            "desc": n.get("desc", ""),
            "date": n.get("date", ""),
            "source": n.get("source", ""),
            "impact": n.get("impact", ""),
            "bias": n.get("bias", "netral")
        })
    total_news_count = len(news_summary_list)

    # 2. Siapkan data teknikal
    tech = tech_input or {}
    price = tech.get("price", "—")
    change = tech.get("change", "—")
    period = tech.get("period", "3M")
    ma20 = tech.get("ma20", "—")
    ma50 = tech.get("ma50", "—")
    rsi_val = tech.get("rsi", "—")
    support = tech.get("support", "—")
    resistance = tech.get("resistance", "—")
    above_ma20 = tech.get("above_ma20", None)
    above_ma50 = tech.get("above_ma50", None)

    emiten_name = EMITEN_NAMES.get(key, key)
    sector = CATEGORY_MAP.get(key, "Pasar Modal")

    # 2b. Ambil data fundamental kuartalan, KSEI, & keterbukaan informasi dari SQLite DB lokal (0 request API)
    fundamental_context_str = "Data spesifik emiten tidak diperlukan (Indeks Pasar)."
    if key != "IHSG":
        try:
            from db_manager import get_company_detail_db
            cd = get_company_detail_db(key)
            if cd:
                prof = cd.get("profile") or {}
                if prof.get("name"):
                    emiten_name = prof["name"]
                if prof.get("sector"):
                    sector = prof["sector"]
                fins = cd.get("financials") or []
                shs = cd.get("shareholders") or []
                discs = cd.get("disclosures") or []
                parts = []
                if fins:
                    latest_f = fins[-1]
                    prev_f = fins[-2] if len(fins) >= 2 else None
                    parts.append(
                        f"- Kinerja Kuartal Terbaru ({latest_f.get('year')}): Pendapatan TTM Rp{latest_f.get('revenue')} T, "
                        f"Laba Bersih TTM Rp{latest_f.get('net')} T (Margin {latest_f.get('margin')}%), "
                        f"EPS Rp{latest_f.get('eps')}, BVPS Rp{latest_f.get('bvps')}, ROE {latest_f.get('roe')}%, "
                        f"Total Aset Rp{latest_f.get('assets')} T, Ekuitas Rp{latest_f.get('equity')} T, "
                        f"Arus Kas Operasi (CFO) Rp{latest_f.get('cfo')} T."
                    )
                    if prev_f:
                        parts.append(
                            f"- Perbandingan Periode Sebelumnya ({prev_f.get('year')}): Pendapatan Rp{prev_f.get('revenue')} T, "
                            f"Laba Bersih Rp{prev_f.get('net')} T."
                        )
                if shs:
                    top_sh = ", ".join([f"{s.get('name')} ({s.get('percentage')}%)" for s in shs[:3]])
                    parts.append(f"- Pemegang Saham Utama KSEI: {top_sh}")
                if discs:
                    top_disc = "; ".join([f"{d.get('date')}: {d.get('title')}" for d in discs[:3]])
                    parts.append(f"- Keterbukaan Informasi BEI Terbaru: {top_disc}")
                if parts:
                    fundamental_context_str = "\n".join(parts)
        except Exception as e_db:
            print(f"[ai_analyst] Info DB read: {e_db}")

    # 3. Panggil Gemini AI
    api_key = get_gemini_api_key()
    if not api_key:
        return _fallback_analysis(key, tech, news_summary_list)

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    wib = timezone(timedelta(hours=7))
    current_time_str = datetime.now(wib).strftime("%d %b %Y, %H:%M WIB")

    prompt = f"""Kamu adalah Chief Market Strategist, Fundamental & Technical Analyst profesional di Bursa Efek Indonesia (IDX).
Tugasmu adalah menyusun 'Ringkasan Eksekutif Terpadu' untuk instrumen {key} ({emiten_name}) berdasarkan data teknikal chart, kinerja laporan keuangan kuartalan resmi BEI dari SQLite DB, dan SELURUH ({total_news_count}) berita pasar/emiten terkini dari Invezgo API:

=== 1. DATA TEKNIKAL GRAFIK ({period}) ===
- Instrumen: {key} ({emiten_name}) · Sektor: {sector}
- Harga Terakhir: Rp{price} ({change}%)
- MA 20 Sesi: Rp{ma20} ({'di atas MA20' if above_ma20 is True else 'di bawah MA20' if above_ma20 is False else 'dekat MA20'})
- MA 50 Sesi: Rp{ma50} ({'di atas MA50' if above_ma50 is True else 'di bawah MA50' if above_ma50 is False else 'dekat MA50'})
- RSI 14 (Wilder): {rsi_val}
- Potensi Support Terdekat: Rp{support}
- Potensi Resistance Terdekat: Rp{resistance}

=== 2. DATA FUNDAMENTAL KUARTALAN, KSEI, & KETERBUKAAN INFORMASI BEI (SQLITE DB) ===
{fundamental_context_str}

=== 3. SELURUH BERITA & KATALIS PASAR TERKINI INVEZGO API ({total_news_count} BERITA) ===
{json.dumps(news_summary_list, indent=2, ensure_ascii=False)}

=== INSTRUKSI ANALISIS ===
Padukan sinyal teknikal chart (tren MA, posisi RSI, batas support/resistance), kekuatan fundamental kuartalan terbaru (laba, arus kas, ROE), serta sintesis menyeluruh dari {total_news_count} berita terbaru di atas.
Buat analisis yang tajam, objektif, dan berorientasi pada keputusan investor.

Format output HANYA sebuah valid JSON murni tanpa markdown wrapper:
{{
  "ticker": "{key}",
  "name": "{emiten_name}",
  "sentiment": "Bullish / Bearish / Konsolidasi / Koreksi Sehat",
  "sentiment_bias": "positif / negatif / netral",
  "executive_summary": "1 paragraf padat (3-4 kalimat) yang menyatukan kondisi teknikal chart, fundamental kuartalan terbaru, dan rangkuman benang merah dari {total_news_count} berita hari ini secara jelas.",
  "technical_insight": "Ulasan teknikal mendalam: posisi harga thd MA20/50, momentum RSI 14 ({rsi_val}), serta pengujian area support Rp{support} dan resistance Rp{resistance}.",
  "catalyst_insight": "Ulasan katalis menyeluruh dari kinerja kuartalan terbaru & {total_news_count} berita Invezgo hari ini: bagaimana katalis tersebut mempengaruhi likuiditas, valuasi, dan prospek harga.",
  "actionable_plan": "Rencana tindakan taktis bagi investor/trader: area masuk (entry/buy on weakness), level stop loss/proteksi, atau rekomendasi wait-and-see.",
  "key_levels": {{
    "support": "Rp{support}",
    "resistance": "Rp{resistance}",
    "rsi": "{rsi_val}",
    "ma_status": "{'Bullish di atas MA20 & MA50' if above_ma20 and above_ma50 else 'Bearish di bawah MA20 & MA50' if above_ma20 is False and above_ma50 is False else 'Tren Campuran'}"
  }},
  "timestamp": "{current_time_str}"
}}
"""

    models_to_try = ["gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-3.6-flash", "gemini-3.8-flash"]

    for model_name in models_to_try:
        try:
            resp = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=1500
                )
            )
            raw_text = resp.text.strip()
            raw_text = re.sub(r"^```json\s*", "", raw_text)
            raw_text = re.sub(r"^```\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)

            res = json.loads(raw_text)
            if isinstance(res, dict) and "executive_summary" in res:
                res["news_used"] = news_summary_list
                res["news_count"] = total_news_count
                _analysis_cache[key] = (now, res)
                return res
        except Exception as e:
            print(f"[ai_analyst] Model {model_name} error: {e}")
            continue

    fallback = _fallback_analysis(key, tech, news_summary_list)
    _analysis_cache[key] = (now, fallback)
    return fallback

def _fallback_analysis(ticker: str, tech: dict, news_items: list) -> dict:
    """Analisis fallback berbasis aturan jika koneksi Gemini AI mengalami kendala."""
    emiten_name = EMITEN_NAMES.get(ticker, ticker)
    price = tech.get("price", "—")
    rsi_val = float(tech.get("rsi", 50)) if str(tech.get("rsi", "")).replace(".","",1).isdigit() else 50.0
    above20 = tech.get("above_ma20", True)
    above50 = tech.get("above_ma50", True)
    support = tech.get("support", "—")
    resistance = tech.get("resistance", "—")

    if above20 and above50:
        sentiment = "Bullish"
        bias = "positif"
    elif not above20 and not above50:
        sentiment = "Bearish"
        bias = "negatif"
    else:
        sentiment = "Konsolidasi"
        bias = "netral"

    wib = timezone(timedelta(hours=7))
    current_time_str = datetime.now(wib).strftime("%d %b %Y, %H:%M WIB")

    news_title = news_items[0]["title"] if news_items else "Aktivitas pasar bursa"

    return {
        "ticker": ticker,
        "name": emiten_name,
        "sentiment": sentiment,
        "sentiment_bias": bias,
        "executive_summary": f"Saham {ticker} saat ini diperdagangkan di Rp{price} dengan kecenderungan {sentiment.lower()}. Di tengah sentimen berita terkini '{news_title}', pergerakan harga menguji level support Rp{support} dan resistance Rp{resistance}.",
        "technical_insight": f"RSI 14 berada di {rsi_val:.1f} dengan status harga {'di atas' if above20 else 'di bawah'} MA20 dan {'di atas' if above50 else 'di bawah'} MA50. Perhatikan konfirmasi volume pada penembusan resistance Rp{resistance}.",
        "catalyst_insight": f"Berita pasar terbaru mencerminkan volatilitas harian. Investor mencermati perkembangan sentimen industri dan arus modal asing.",
        "actionable_plan": f"Disarankan strategi 'Buy on Weakness' dekat level support Rp{support} dengan batasan risiko ketat jika harga tembus di bawahnya.",
        "key_levels": {
            "support": f"Rp{support}",
            "resistance": f"Rp{resistance}",
            "rsi": f"{rsi_val:.1f}",
            "ma_status": f"{sentiment} terhadap Moving Average"
        },
        "news_used": news_items,
        "timestamp": current_time_str
    }

if __name__ == "__main__":
    import sys
    t = sys.argv[1] if len(sys.argv) > 1 else "IHSG"
    sample_tech = {
        "price": "6175",
        "change": "-1.2",
        "period": "3M",
        "ma20": "6250",
        "ma50": "6320",
        "rsi": "38.5",
        "support": "6100",
        "resistance": "6300",
        "above_ma20": False,
        "above_ma50": False
    }
    result = analyze_market_instrument(t, sample_tech, force_refresh=True)
    print(json.dumps(result, indent=2, ensure_ascii=False))
