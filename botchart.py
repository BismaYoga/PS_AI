import os
import pandas as pd
import numpy as np
import yfinance as yf
import mplfinance as mpf
import matplotlib.pyplot as plt

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes


# =========================================================
# CONFIG
# =========================================================

TOKEN = "8773021457:AAHYScIfprNraSI64SYWCtCweS8H_hau-Gc"

# Target Grup dan Topik Telegram spesifik
TARGET_CHAT_ID = -1001364042873
TARGET_THREAD_ID = 316950

COLOR_UP = "#26A69A"
COLOR_DOWN = "#EF5350"

COLOR_MA5 = "#EF5350"
COLOR_MA20 = "#29B6F6"
COLOR_MA50 = "#1565C0"

COLOR_MACD = "#2196F3"
COLOR_SIGNAL = "#FF9800"

COLOR_GRID = "#E9ECEF"
COLOR_TEXT = "#424242"
COLOR_MUTED = "#757575"


# =========================================================
# INDIKATOR
# =========================================================

def hitung_indikator(data):
    """
    Menghitung:
    - MA 5 / 20 / 50
    - Volume MA20
    - MACD 12,26,9
    - RSI 14
    - Stochastic RSI 14,14,3,3
    """

    data = data.copy()

    # Moving Average
    data["MA5"] = data["Close"].rolling(5).mean()
    data["MA20"] = data["Close"].rolling(20).mean()
    data["MA50"] = data["Close"].rolling(50).mean()

    # Volume Moving Average
    data["Vol_MA20"] = data["Volume"].rolling(20).mean()

    # -------------------------
    # MACD
    # -------------------------

    ema12 = data["Close"].ewm(span=12, adjust=False).mean()
    ema26 = data["Close"].ewm(span=26, adjust=False).mean()

    data["MACD"] = ema12 - ema26
    data["Signal"] = data["MACD"].ewm(span=9, adjust=False).mean()
    data["Hist"] = data["MACD"] - data["Signal"]

    # -------------------------
    # RSI Wilder
    # -------------------------

    delta = data["Close"].diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.ewm(
        alpha=1 / 14,
        adjust=False,
        min_periods=14
    ).mean()

    avg_loss = loss.ewm(
        alpha=1 / 14,
        adjust=False,
        min_periods=14
    ).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)

    data["RSI"] = 100 - (100 / (1 + rs))

    # -------------------------
    # Stochastic RSI
    # -------------------------

    rsi_min = data["RSI"].rolling(14).min()
    rsi_max = data["RSI"].rolling(14).max()

    denominator = (rsi_max - rsi_min).replace(0, np.nan)

    data["StochRSI"] = (
        (data["RSI"] - rsi_min) /
        denominator
    ) * 100

    data["Stoch_K"] = data["StochRSI"].rolling(3).mean()
    data["Stoch_D"] = data["Stoch_K"].rolling(3).mean()

    return data


# =========================================================
# FORMAT ANGKA
# =========================================================

def format_angka_besar(value):

    if pd.isna(value):
        return "-"

    if abs(value) >= 1_000_000_000:
        return f"{value / 1_000_000_000:.2f}B"

    if abs(value) >= 1_000_000:
        return f"{value / 1_000_000:.2f}M"

    if abs(value) >= 1_000:
        return f"{value / 1_000:.2f}K"

    return f"{value:.0f}"


def format_harga(value):

    if pd.isna(value):
        return "-"

    return f"{value:,.0f}".replace(",", ".")


# =========================================================
# MENAMBAHKAN SPACE KANAN CHART
# =========================================================

def tambah_space_kanan(data, timeframe, jumlah=5):

    last_date = data.index[-1]

    if timeframe in ["daily", "d", "harian"]:

        future_dates = pd.bdate_range(
            start=last_date + pd.Timedelta(days=1),
            periods=jumlah
        )

    elif timeframe in ["weekly", "w", "mingguan"]:

        future_dates = pd.date_range(
            start=last_date + pd.Timedelta(days=7),
            periods=jumlah,
            freq="7D"
        )

    else:

        future_dates = pd.DatetimeIndex([
            last_date + pd.DateOffset(months=i)
            for i in range(1, jumlah + 1)
        ])

    # Samakan timezone jika diperlukan
    if last_date.tz is not None:

        if future_dates.tz is None:
            future_dates = future_dates.tz_localize(last_date.tz)

    kosong = pd.DataFrame(
        np.nan,
        index=future_dates,
        columns=data.columns
    )

    return pd.concat([data, kosong])


# =========================================================
# STYLE CHART
# =========================================================

def buat_style():

    market_colors = mpf.make_marketcolors(
        up=COLOR_UP,
        down=COLOR_DOWN,

        edge={
            "up": COLOR_UP,
            "down": COLOR_DOWN
        },

        wick={
            "up": COLOR_UP,
            "down": COLOR_DOWN
        },

        volume={
            "up": COLOR_UP,
            "down": COLOR_DOWN
        }
    )

    style = mpf.make_mpf_style(

        marketcolors=market_colors,

        facecolor="white",
        figcolor="white",

        gridcolor=COLOR_GRID,
        gridstyle="-",

        y_on_right=True,

        rc={
            "font.family": "DejaVu Sans",

            "font.size": 9,

            "axes.labelsize": 9,

            "axes.edgecolor": "#DADCE0",

            "axes.linewidth": 0.8,

            "xtick.color": "#616161",
            "ytick.color": "#616161",

            "xtick.labelsize": 8,
            "ytick.labelsize": 8
        }
    )

    return style


# =========================================================
# TELEGRAM START
# =========================================================

async def start(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
):

    pesan = (
        "Halo! Saya Bot Chart Saham 📈\n\n"
        "Gunakan:\n"
        "/chart <kode_saham> [timeframe]\n\n"
        "Timeframe:\n"
        "• daily\n"
        "• weekly\n"
        "• monthly\n\n"
        "Contoh:\n"
        "/chart BBCA.JK\n"
        "/chart BBCA.JK weekly"
    )

    await update.message.reply_text(pesan)


# =========================================================
# COMMAND CHART
# =========================================================

async def chart(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
):

    if len(context.args) == 0:

        await update.message.reply_text(
            "Masukkan kode saham.\n"
            "Contoh: /chart BBCA.JK"
        )

        return

    ticker = context.args[0].upper()
    timeframe = "daily"

    if len(context.args) > 1:
        timeframe = context.args[1].lower()


    # =====================================================
    # TIMEFRAME
    # =====================================================

    if timeframe in ["daily", "d", "harian"]:

        period = "6mo"
        interval = "1d"
        judul_tf = "1D"

    elif timeframe in ["weekly", "w", "mingguan"]:

        period = "2y"
        interval = "1wk"
        judul_tf = "1W"

    elif timeframe in ["monthly", "m", "bulanan"]:

        period = "5y"
        interval = "1mo"
        judul_tf = "1M"

    else:

        await update.message.reply_text(
            "❌ Timeframe tidak dikenali.\n\n"
            "Gunakan:\n"
            "daily, weekly, atau monthly."
        )

        return


    pesan_tunggu = await update.message.reply_text(
        f"⏳ Membuat chart {ticker}..."
    )


    try:

        # =================================================
        # DOWNLOAD DATA
        # =================================================

        saham = yf.Ticker(ticker)

        data_original = saham.history(
            period=period,
            interval=interval,
            auto_adjust=False
        )

        if data_original.empty:

            await pesan_tunggu.edit_text(
                f"❌ Data {ticker} tidak ditemukan."
            )

            return


        # Hilangkan timezone supaya matplotlib lebih stabil
        if data_original.index.tz is not None:

            data_original.index = (
                data_original.index.tz_localize(None)
            )


        # =================================================
        # INDIKATOR
        # =================================================

        data_original = hitung_indikator(data_original)

        last = data_original.iloc[-1]

        previous = data_original.iloc[-2]


        # =================================================
        # NILAI TERAKHIR
        # =================================================

        open_last = last["Open"]
        high_last = last["High"]
        low_last = last["Low"]
        close_last = last["Close"]

        ma5 = last["MA5"]
        ma20 = last["MA20"]
        ma50 = last["MA50"]

        volume_last = last["Volume"]
        volume_ma20 = last["Vol_MA20"]

        macd_last = last["MACD"]
        signal_last = last["Signal"]
        hist_last = last["Hist"]

        stoch_k = last["Stoch_K"]
        stoch_d = last["Stoch_D"]


        if close_last >= previous["Close"]:
            warna_harga = COLOR_UP
        else:
            warna_harga = COLOR_DOWN


        # =================================================
        # SPACE KOSONG DI KANAN
        # =================================================

        data = tambah_space_kanan(
            data_original,
            timeframe,
            jumlah=5
        )


        # =================================================
        # WARNA HISTOGRAM MACD
        # =================================================

        hist_colors = []

        for value in data["Hist"]:

            if pd.isna(value):

                hist_colors.append("none")

            elif value >= 0:

                hist_colors.append(COLOR_UP)

            else:

                hist_colors.append(COLOR_DOWN)


        # =================================================
        # ADD PLOT
        # =================================================

        add_plots = [

            # -------------------------
            # PRICE
            # -------------------------

            mpf.make_addplot(
                data["MA5"],
                panel=0,
                color=COLOR_MA5,
                width=1.1
            ),

            mpf.make_addplot(
                data["MA20"],
                panel=0,
                color=COLOR_MA20,
                width=1.2
            ),

            mpf.make_addplot(
                data["MA50"],
                panel=0,
                color=COLOR_MA50,
                width=1.3
            ),


            # -------------------------
            # VOLUME MA
            # -------------------------

            mpf.make_addplot(
                data["Vol_MA20"],
                panel=1,
                color=COLOR_MA20,
                width=1.0
            ),


            # -------------------------
            # MACD
            # -------------------------

            mpf.make_addplot(
                data["MACD"],
                panel=2,
                color=COLOR_MACD,
                width=1.2
            ),

            mpf.make_addplot(
                data["Signal"],
                panel=2,
                color=COLOR_SIGNAL,
                width=1.2
            ),

            mpf.make_addplot(
                data["Hist"],
                panel=2,
                type="bar",
                color=hist_colors,
                alpha=0.75,
                width=0.7
            ),


            # -------------------------
            # STOCH RSI
            # -------------------------

            mpf.make_addplot(
                data["Stoch_K"],
                panel=3,
                color=COLOR_MACD,
                width=1.2
            ),

            mpf.make_addplot(
                data["Stoch_D"],
                panel=3,
                color=COLOR_SIGNAL,
                width=1.2
            )
        ]


        # =================================================
        # PLOT
        # =================================================

        style = buat_style()

        fig, axlist = mpf.plot(

            data,

            type="candle",

            style=style,

            addplot=add_plots,

            volume=True,
            volume_panel=1,

            panel_ratios=(
                5,
                1.15,
                1.55,
                1.55
            ),

            figsize=(15, 8.4),

            datetime_format="%d %b",

            xrotation=0,

            show_nontrading=False,

            returnfig=True
        )

        ax_price = axlist[0]
        ax_volume = axlist[2]
        ax_macd = axlist[4]
        ax_stoch = axlist[6]


        # =================================================
        # LAYOUT
        # =================================================

        fig.subplots_adjust(
            left=0.055,
            right=0.91,
            top=0.96,
            bottom=0.09,
            hspace=0.06
        )


        # Hilangkan label tanggal pada panel atas
        for ax in [
            ax_price,
            ax_volume,
            ax_macd
        ]:

            ax.tick_params(
                axis="x",
                labelbottom=False
            )


        # Grid lebih halus
        for ax in [
            ax_price,
            ax_volume,
            ax_macd,
            ax_stoch
        ]:

            ax.grid(
                True,
                linewidth=0.6,
                alpha=0.65
            )

            ax.tick_params(
                axis="y",
                labelsize=8,
                length=0,
                pad=5
            )


        # =================================================
        # PRICE HEADER
        # =================================================

        price_title = (
            f"{ticker}   •   {judul_tf}   •   Yahoo Finance"
        )

        ax_price.text(
            0.012,
            0.975,
            price_title,

            transform=ax_price.transAxes,

            ha="left",
            va="top",

            fontsize=5,
            fontweight="bold",
            color="#212121"
        )


        ohlc_text = (
            f"O {format_harga(open_last)}   "
            f"H {format_harga(high_last)}   "
            f"L {format_harga(low_last)}   "
            f"C {format_harga(close_last)}"
        )

        ax_price.text(
            0.012,
            0.925,
            ohlc_text,

            transform=ax_price.transAxes,

            ha="left",
            va="top",

            fontsize=5,
            color=warna_harga,
            fontweight="bold"
        )


        # =================================================
        # MA LEGEND
        # =================================================

        ax_price.text(
            0.012,
            0.875,
            "MA5",
            transform=ax_price.transAxes,
            fontsize=5,
            color=COLOR_MA5,
            fontweight="bold"
        )

        ax_price.text(
            0.053,
            0.875,
            format_harga(ma5),
            transform=ax_price.transAxes,
            fontsize=5,
            color=COLOR_TEXT,
            fontweight="bold"
        )


        ax_price.text(
            0.11,
            0.875,
            "MA20",
            transform=ax_price.transAxes,
            fontsize=5,
            color=COLOR_MA20,
            fontweight="bold"
        )

        ax_price.text(
            0.162,
            0.875,
            format_harga(ma20),
            transform=ax_price.transAxes,
            fontsize=5,
            color=COLOR_TEXT,
            fontweight="bold"
        )


        ax_price.text(
            0.22,
            0.875,
            "MA50",
            transform=ax_price.transAxes,
            fontsize=5,
            color=COLOR_MA50,
            fontweight="bold"
        )

        ax_price.text(
            0.272,
            0.875,
            format_harga(ma50),
            transform=ax_price.transAxes,
            fontsize=5,
            color=COLOR_TEXT,
            fontweight="bold"
        )


        # =================================================
        # GARIS & LABEL HARGA TERAKHIR
        # =================================================

        ax_price.axhline(
            close_last,
            color=warna_harga,
            linestyle=(0, (4, 3)),
            linewidth=0.9,
            alpha=0.65
        )

        ax_price.annotate(
            format_harga(close_last),
            xy=(1, close_last),
            xycoords=("axes fraction", "data"),
            xytext=(8, 0),
            textcoords="offset points",
            ha="left",
            va="center",
            fontsize=9,
            fontweight="bold",
            color="white",
            bbox=dict(
                boxstyle="round,pad=0.3",
                facecolor=warna_harga,
                edgecolor="none"
            ),
            clip_on=False
        )


        # =================================================
        # VOLUME & INDIKATOR LAINNYA
        # =================================================

        volume_text = (
            f"Volume   "
            f"{format_angka_besar(volume_last)}"
            f"   •   MA20 "
            f"{format_angka_besar(volume_ma20)}"
        )

        ax_volume.text(
            0.012, 0.90, volume_text,
            transform=ax_volume.transAxes,
            ha="left", va="top",
            fontsize=8.5, color=COLOR_TEXT
        )

        ax_volume.ticklabel_format(style="plain", axis="y")


        macd_text = (
            "MACD (12, 26, 9)"
            f"    MACD {macd_last:.2f}"
            f"    Signal {signal_last:.2f}"
            f"    Hist {hist_last:.2f}"
        )

        ax_macd.text(
            0.012, 0.92, macd_text,
            transform=ax_macd.transAxes,
            ha="left", va="top",
            fontsize=8.5, color=COLOR_TEXT
        )

        ax_macd.axhline(0, color="#9E9E9E", linewidth=0.8, alpha=0.7)


        stoch_text = (
            "Stochastic RSI (14, 14, 3, 3)"
            f"    K {stoch_k:.2f}"
            f"    D {stoch_d:.2f}"
        )

        ax_stoch.text(
            0.012, 0.92, stoch_text,
            transform=ax_stoch.transAxes,
            ha="left", va="top",
            fontsize=8.5, color=COLOR_TEXT
        )

        ax_stoch.axhline(80, color="#9E9E9E", linestyle="--", linewidth=0.8, alpha=0.7)
        ax_stoch.axhline(20, color="#9E9E9E", linestyle="--", linewidth=0.8, alpha=0.7)
        ax_stoch.set_ylim(0, 100)
        ax_stoch.set_yticks([0, 20, 50, 80, 100])


        # =================================================
        # LABEL AXIS
        # =================================================

        ax_price.set_ylabel("Price", fontsize=8, color=COLOR_MUTED)
        ax_volume.set_ylabel("Vol", fontsize=8, color=COLOR_MUTED)
        ax_macd.set_ylabel("MACD", fontsize=8, color=COLOR_MUTED)
        ax_stoch.set_ylabel("Stoch RSI", fontsize=8, color=COLOR_MUTED)


        # =================================================
        # SAVE
        # =================================================

        ticker_file = ticker.replace(".", "_")
        nama_file = f"chart_{ticker_file}_{timeframe}.png"

        fig.savefig(
            nama_file,
            dpi=180,
            bbox_inches="tight",
            facecolor="white",
            pad_inches=0.12
        )

        plt.close(fig)


        # =================================================
        # SEND TELEGRAM KE TOPIK SPESIFIK
        # =================================================

        with open(nama_file, "rb") as foto:

            await context.bot.send_photo(
                chat_id=TARGET_CHAT_ID,
                message_thread_id=TARGET_THREAD_ID,
                photo=foto,
                caption=(
                    f"{ticker} • {judul_tf} • Close: {format_harga(close_last)}"
                )
            )


        await pesan_tunggu.delete()


        # Hapus file setelah terkirim
        if os.path.exists(nama_file):
            os.remove(nama_file)


    except Exception as e:

        await pesan_tunggu.edit_text(
            f"⚠️ Terjadi kesalahan:\n{e}"
        )


# =========================================================
# RUN BOT
# =========================================================

if __name__ == "__main__":

    print("Bot Chart Saham sedang berjalan...")

    app = (
        Application.builder()
        .token(TOKEN)
        .build()
    )

    app.add_handler(
        CommandHandler("start", start)
    )

    app.add_handler(
        CommandHandler("chart", chart)
    )

    app.run_polling()

