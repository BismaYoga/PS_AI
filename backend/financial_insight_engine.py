"""
financial_insight_engine.py — Smart Financial Summary & Health Insight Engine
Menghasilkan analisis fundamental otomatis (Balance Sheet, Income Statement, Cash Flow, & Verdict)
dengan smart caching ke SQLite: HANYA di-generate ulang ketika ada penambahan periode data baru.
"""

import os
import json
import time
import math
from fetch_news import get_gemini_api_key
from db_manager import get_company_detail_db, get_financial_insight_db, save_financial_insight_db
from invezgo_client import fetch_company_complete_invezgo

GEMINI_MODELS = ["gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-1.5-flash"]


def _calculate_cagr(start_val: float, end_val: float, years: int) -> float | None:
    if not start_val or not end_val or start_val <= 0 or end_val <= 0 or years <= 0:
        return None
    try:
        return ((end_val / start_val) ** (1.0 / years) - 1.0) * 100.0
    except Exception:
        return None


def calculate_metrics_and_health(financials_q: list, financials_fy: list) -> dict:
    """Hitung rasio-rasio pasti dan skor kesehatan 0-10 berdasarkan data kuartalan & tahunan."""
    latest_q = financials_q[-1] if financials_q else {}
    latest_fy = financials_fy[-1] if financials_fy else {}

    # Metrik primer (ambil dari annual jika ada, fallback kuartalan)
    revenue = float(latest_q.get("revenue") or latest_fy.get("revenue") or 0)
    net_income = float(latest_q.get("net") or latest_fy.get("net") or 0)
    gross_profit = float(latest_q.get("grossProfit") or latest_fy.get("grossProfit") or 0)
    assets = float(latest_q.get("assets") or latest_fy.get("assets") or 0)
    equity = float(latest_q.get("equity") or latest_fy.get("equity") or 0)
    liabilities = float(latest_q.get("liabilities") or latest_fy.get("liabilities") or 0)
    cash = float(latest_q.get("cash") or latest_fy.get("cash") or 0)
    cfo = float(latest_q.get("cfo") or latest_fy.get("cfo") or 0)
    fcf = float(latest_q.get("fcf") or latest_fy.get("fcf") or 0)

    # Ratios
    der = round(liabilities / equity, 2) if equity > 0 else (float(latest_q.get("der") or 0))
    npm = round((net_income / revenue) * 100, 1) if revenue > 0 else (float(latest_q.get("margin") or 0))
    roe = round((net_income / equity) * 100, 1) if equity > 0 else (float(latest_q.get("roe") or 0))
    cfo_net_ratio = round(cfo / net_income, 2) if net_income > 0 else 0.0

    # CAGR Multi-Tahun jika ada data tahunan (FY 2019 - 2025)
    cagr_rev_3y = None
    cagr_net_3y = None
    if len(financials_fy) >= 4:
        v_start_rev = float(financials_fy[-4].get("revenue") or 0)
        v_end_rev = float(financials_fy[-1].get("revenue") or 0)
        cagr_rev_3y = _calculate_cagr(v_start_rev, v_end_rev, 3)

        v_start_net = float(financials_fy[-4].get("net") or 0)
        v_end_net = float(financials_fy[-1].get("net") or 0)
        cagr_net_3y = _calculate_cagr(v_start_net, v_end_net, 3)

    # Hitung Financial Health Score (0 - 10)
    score = 0.0

    # 1. Solvency & Balance Sheet (Max 2.5 pts)
    if der < 0.8:
        score += 2.5
    elif der < 1.5:
        score += 1.8
    elif der < 2.5:
        score += 1.0
    else:
        score += 0.5

    # 2. Profitability & Margin (Max 2.5 pts)
    if npm >= 20.0:
        score += 2.5
    elif npm >= 10.0:
        score += 2.0
    elif npm >= 4.0:
        score += 1.2
    elif npm > 0:
        score += 0.5

    # 3. Cash Flow Quality (Max 2.5 pts)
    if cfo > 0 and cfo_net_ratio >= 0.8:
        score += 2.5
    elif cfo > 0:
        score += 1.8
    elif cfo == 0:
        score += 1.0
    else:
        score += 0.2

    # 4. ROE / Efisiensi Modal (Max 2.5 pts)
    if roe >= 15.0:
        score += 2.5
    elif roe >= 10.0:
        score += 1.8
    elif roe >= 5.0:
        score += 1.0
    elif roe > 0:
        score += 0.5

    score = round(min(10.0, max(1.0, score)), 1)
    if score >= 8.0:
        health_status = "Sangat Sehat & Solid"
    elif score >= 6.5:
        health_status = "Sehat & Stabil"
    elif score >= 5.0:
        health_status = "Cukup Sehat (Moderat)"
    else:
        health_status = "Waspada (Perhatian Khusus)"

    return {
        "revenue": revenue,
        "net_income": net_income,
        "assets": assets,
        "liabilities": liabilities,
        "equity": equity,
        "cash": cash,
        "cfo": cfo,
        "fcf": fcf,
        "der": der,
        "npm": npm,
        "roe": roe,
        "cfo_net_ratio": cfo_net_ratio,
        "cagr_rev_3y": round(cagr_rev_3y, 1) if cagr_rev_3y is not None else None,
        "cagr_net_3y": round(cagr_net_3y, 1) if cagr_net_3y is not None else None,
        "health_score": score,
        "health_status": health_status,
        "latest_q_period": latest_q.get("year", "N/A"),
        "latest_fy_period": latest_fy.get("year", "N/A"),
    }


def _build_deterministic_insight(ticker: str, metrics: dict) -> dict:
    """Template insight deterministik berbasis angka real (fallback instan tanpa API AI)."""
    der = metrics["der"]
    npm = metrics["npm"]
    roe = metrics["roe"]
    cfo = metrics["cfo"]
    fcf = metrics["fcf"]
    cfo_ratio = metrics["cfo_net_ratio"]
    score = metrics["health_score"]
    status = metrics["health_status"]
    q_per = metrics["latest_q_period"]
    fy_per = metrics["latest_fy_period"]

    # Balance Sheet text
    if der < 0.8:
        bs_status = "Sangat Sehat"
        bs_badge = f"DER {der}x • Solvabilitas Sangat Aman"
        bs_summary = f"Struktur modal {ticker} sangat kokoh dengan porsi kewajiban yang minim terhadap ekuitas. Risiko gagal bayar utang berada pada tingkat sangat rendah."
        bs_points = [
            f"Rasio utang terhadap ekuitas (DER) tercatat {der}x, berada jauh di bawah batas konservatif 1.0x.",
            f"Ekuitas bersih sebesar Rp {metrics['equity']:,.2f} triliun menjadi bantalan modal kuat untuk ekspansi tanpa beban bunga berlebih.",
            f"Posisi kas dan setara kas tercatat sebesar Rp {metrics['cash']:,.2f} triliun."
        ]
    elif der < 1.8:
        bs_status = "Terkendali"
        bs_badge = f"DER {der}x • Utang Wajar"
        bs_summary = f"Struktur permodalan {ticker} masih dalam rentang sehat operasional, didukung oleh pengelolaan likuiditas yang disiplin."
        bs_points = [
            f"Rasio DER berada di level {der}x, mencerminkan pemanfaatan leverage modal yang terukur.",
            f"Total aset mencapai Rp {metrics['assets']:,.2f} triliun berbanding liabilitas Rp {metrics['liabilities']:,.2f} triliun."
        ]
    else:
        bs_status = "Perhatian"
        bs_badge = f"DER {der}x • Leverage Tinggi"
        bs_summary = f"Porsi liabilitas {ticker} cukup tinggi terhadap ekuitas. Investor perlu memantau jatuh tempo utang berbunga jangka pendek."
        bs_points = [
            f"Rasio DER {der}x tergolong tinggi, membutuhkan kecukupan laba operasional stabil untuk menutup beban bunga.",
            f"Total liabilitas tercatat sebesar Rp {metrics['liabilities']:,.2f} triliun."
        ]

    # Income Statement text
    if npm >= 18.0:
        is_status = "Sangat Profitabel"
        is_badge = f"NPM {npm}% • Pricing Power Kuat"
        is_summary = f"{ticker} memiliki efisiensi operasional luar biasa dan daya saing tinggi (moat), terbukti dari marjin laba bersih yang sangat tebal."
        is_points = [
            f"Net Profit Margin (NPM) mencapai {npm}%, menunjukkan setiap pendapatan mampu dikonversi menjadi laba bersih secara maksimal.",
            f"Return on Equity (ROE) berada di {roe}%, menandakan efisiensi tinggi manajemen dalam memutar modal pemegang saham.",
            f"Pendapatan tercatat Rp {metrics['revenue']:,.2f} triliun dengan laba bersih Rp {metrics['net_income']:,.2f} triliun."
        ]
    elif npm >= 6.0:
        is_status = "Profitabel Stabil"
        is_badge = f"NPM {npm}% • Margin Sehat"
        is_summary = f"Kinerja laba rugi {ticker} terjaga baik dengan margin keuntungan yang wajar di sektor industrinya."
        is_points = [
            f"Net Profit Margin tercatat {npm}%, dengan ROE sebesar {roe}%.",
            f"Laba bersih berhasil dibukukan sebesar Rp {metrics['net_income']:,.2f} triliun dari omzet Rp {metrics['revenue']:,.2f} triliun."
        ]
    else:
        is_status = "Marjin Tipis"
        is_badge = f"NPM {npm}% • Tekanan Beban"
        is_summary = f"Tingkat profitabilitas {ticker} relatif tipis atau tertekan oleh beban pokok dan operasional."
        is_points = [
            f"Marjin laba bersih berada di level {npm}%, sensitif terhadap kenaikan biaya bahan baku atau bunga.",
            f"ROE tercatat sebesar {roe}%."
        ]

    # Cash Flow text
    if cfo > 0 and cfo_ratio >= 0.7:
        cf_status = "Arus Kas Solid"
        cf_badge = f"CFO Rp {cfo:,.2f}T • Kualitas Laba Prima"
        cf_summary = f"Kualitas laba {ticker} terkonfirmasi nyata dalam bentuk arus kas masuk operasional tunai, bukan sekadar angka piutang akuntansi."
        cf_points = [
            f"Arus kas dari aktivitas operasi (CFO) positif kuat sebesar Rp {cfo:,.2f} triliun.",
            f"Rasio CFO terhadap laba bersih tercatat {cfo_ratio}x, membuktikan konversi kas yang sangat sehat.",
            f"Free Cash Flow (FCF) tercatat Rp {fcf:,.2f} triliun, memberi keleluasaan pembagian dividen tunai dan belanja modal mandiri."
        ]
    elif cfo > 0:
        cf_status = "Kas Operasi Positif"
        cf_badge = f"CFO Rp {cfo:,.2f}T • FCF Terjaga"
        cf_summary = f"Arus kas operasional positif menopang kelangsungan bisnis, meski terdapat sebagian kas yang terikat pada modal kerja."
        cf_points = [
            f"CFO positif sebesar Rp {cfo:,.2f} triliun mencukupi kebutuhan operasional harian.",
            f"Free Cash Flow berada di level Rp {fcf:,.2f} triliun."
        ]
    else:
        cf_status = "Arus Kas Defisit"
        cf_badge = f"CFO Negatif (Rp {cfo:,.2f}T)"
        cf_summary = f"Arus kas operasional mengalami defisit kas keluar, mengindikasikan lonjakan piutang, penumpukan persediaan, atau kebutuhan modal kerja tinggi."
        cf_points = [
            f"CFO tercatat negatif Rp {abs(cfo):,.2f} triliun, perlu dicermati perputaran modal kerja.",
            f"Free Cash Flow berada di level Rp {fcf:,.2f} triliun."
        ]

    # Verdict
    verdict = (
        f"{ticker} membukukan skor kesehatan fundamental {score}/10 ({status}). "
        f"Kekuatan utama terletak pada neraca yang {bs_status.lower()} (DER {der}x) "
        f"serta kemampuan profitabilitas dengan NPM {npm}% dan arus kas operasional Rp {cfo:,.2f}T. "
        f"Secara umum, fundamental emiten ini mencerminkan struktur bisnis yang berdaya tahan solid."
    )

    return {
        "health_score": score,
        "health_status": status,
        "verdict": verdict,
        "balance_sheet": {
            "status": bs_status,
            "badge": bs_badge,
            "summary": bs_summary,
            "highlights": bs_points,
        },
        "income_statement": {
            "status": is_status,
            "badge": is_badge,
            "summary": is_summary,
            "highlights": is_points,
        },
        "cash_flow": {
            "status": cf_status,
            "badge": cf_badge,
            "summary": cf_summary,
            "highlights": cf_points,
        },
        "key_metrics": {
            "der": f"{der}x",
            "npm": f"{npm}%",
            "roe": f"{roe}%",
            "cfo_to_net": f"{cfo_ratio}x",
            "cagr_rev_3y": f"{metrics['cagr_rev_3y']}%" if metrics["cagr_rev_3y"] is not None else "-",
            "cagr_net_3y": f"{metrics['cagr_net_3y']}%" if metrics["cagr_net_3y"] is not None else "-",
            "cfo_t": f"Rp {cfo:,.2f}T",
            "fcf_t": f"Rp {fcf:,.2f}T",
        },
    }


def _refine_insight_with_gemini(ticker: str, metrics: dict, base_insight: dict) -> dict:
    """Perkaya narasi insight menggunakan Gemini agar terdengar seperti analis senior Indonesia."""
    api_key = get_gemini_api_key()
    if not api_key:
        return base_insight

    import urllib.request

    prompt = f"""Kamu adalah Kepala Analis Fundamental Senior Pasar Modal Indonesia.
Tuliskan ringkasan insight fundamental eksekutif yang sangat tajam, profesional, dan mudah dipahami untuk saham {ticker} berdasarkan data berikut:
- Periode Data: {metrics['latest_q_period']} (Kuartalan) dan {metrics['latest_fy_period']} (Tahunan)
- Pendapatan: Rp {metrics['revenue']} Triliun
- Laba Bersih: Rp {metrics['net_income']} Triliun
- Net Profit Margin (NPM): {metrics['npm']}%
- Total Aset: Rp {metrics['assets']} T, Ekuitas: Rp {metrics['equity']} T, Liabilitas: Rp {metrics['liabilities']} T
- Debt to Equity Ratio (DER): {metrics['der']}x
- Return on Equity (ROE): {metrics['roe']}%
- Arus Kas Operasional (CFO): Rp {metrics['cfo']} Triliun (Rasio CFO/Laba Bersih: {metrics['cfo_net_ratio']}x)
- Free Cash Flow (FCF): Rp {metrics['fcf']} Triliun
- Pertumbuhan CAGR Pendapatan 3Y: {metrics['cagr_rev_3y']}%
- Skor Fundamental: {metrics['health_score']}/10 ({metrics['health_status']})

Outputkan HANYA format JSON valid tanpa tanda markdown (tanpa ```json) dengan struktur persis berikut:
{{
  "verdict": "2-3 kalimat kesimpulan eksekutif yang lugas dan berwibawa...",
  "balance_sheet_summary": "1-2 kalimat narasi analisis neraca, utang, dan likuiditas...",
  "income_statement_summary": "1-2 kalimat narasi analisis pertumbuhan omzet, efisiensi margin, dan daya saing...",
  "cash_flow_summary": "1-2 kalimat narasi analisis kualitas arus kas operasional (CFO) dan keleluasaan FCF/dividen..."
}}
"""
    for model_name in GEMINI_MODELS:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            req_data = json.dumps({
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 800}
            }).encode('utf-8')
            req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=12) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text.startswith("```"):
                    lines = text.split("\n")
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    text = "\n".join(lines).strip()
                parsed = json.loads(text)
                if "verdict" in parsed:
                    base_insight["verdict"] = parsed.get("verdict", base_insight["verdict"])
                    if "balance_sheet_summary" in parsed:
                        base_insight["balance_sheet"]["summary"] = parsed["balance_sheet_summary"]
                    if "income_statement_summary" in parsed:
                        base_insight["income_statement"]["summary"] = parsed["income_statement_summary"]
                    if "cash_flow_summary" in parsed:
                        base_insight["cash_flow"]["summary"] = parsed["cash_flow_summary"]
                    return base_insight
        except Exception as e:
            # Fallback ke model berikutnya atau template
            continue

    return base_insight


def get_or_generate_financial_insight(ticker: str, force_refresh: bool = False) -> dict:
    """
    Fungsi Utama:
    1. Ambil data laporan keuangan emiten.
    2. Cek apakah period_tag data saat ini sudah ada di cache SQLite.
    3. Jika SUDAH ADA dan tidak ada penambahan data baru -> kembalikan instan dari DB (cached: True).
    4. Jika BELUM ADA atau ada data baru -> generate insight baru, simpan ke SQLite, lalu return (cached: False).
    """
    clean = ticker.upper().strip()
    company_data = get_company_detail_db(clean)
    if not company_data or not company_data.get("financials"):
        # Coba ambil data dari client jika belum ada di DB lokal
        company_data = fetch_company_complete_invezgo(clean)

    financials_q = company_data.get("financials", [])
    financials_fy = company_data.get("financials_annual") or company_data.get("financialsAnnual") or []

    if not financials_q and not financials_fy:
        return {
            "ticker": clean,
            "error": "Data laporan keuangan belum tersedia untuk emiten ini.",
            "insight": None,
        }

    # Buat period_tag dari periode laporan terakhir
    latest_q_label = financials_q[-1].get("year") or financials_q[-1].get("period") if financials_q else "NA"
    latest_fy_label = financials_fy[-1].get("year") or financials_fy[-1].get("period") if financials_fy else "NA"
    period_tag = f"{latest_q_label}_{latest_fy_label}"

    # Cek Cache SQLite
    if not force_refresh:
        cached_record = get_financial_insight_db(clean)
        if cached_record and cached_record.get("period_tag") == period_tag and cached_record.get("insight"):
            return {
                "ticker": clean,
                "cached": True,
                "period_tag": period_tag,
                "health_score": cached_record.get("health_score", 0),
                "insight": cached_record.get("insight"),
                "updated_at": cached_record.get("updated_at"),
            }

    # Hitung metrik keuangan real
    metrics = calculate_metrics_and_health(financials_q, financials_fy)
    base_insight = _build_deterministic_insight(clean, metrics)

    # Perkaya dengan LLM Gemini (dengan fallback aman ke base_insight)
    try:
        final_insight = _refine_insight_with_gemini(clean, metrics, base_insight)
    except Exception:
        final_insight = base_insight

    # Simpan ke SQLite Database secara permanen
    save_financial_insight_db(clean, period_tag, final_insight, metrics["health_score"])

    return {
        "ticker": clean,
        "cached": False,
        "period_tag": period_tag,
        "health_score": metrics["health_score"],
        "insight": final_insight,
        "updated_at": time.time(),
    }
