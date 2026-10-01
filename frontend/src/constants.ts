// PintarSaham Constants - 1:1 with Legacy Prototype
import { EmitenItem, CorporateEvent, PresetStock, NewsItem } from './types';

export const ICONS: Record<string, string> = {chart:'<path d="M18 20V10M12 20V4M6 20v-6"/>',book:'<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',sparkles:'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/><path d="m20 3 .7 2.3L23 6l-2.3.7L20 9l-.7-2.3L17 6l2.3-.7L20 3Z"/>',star:'<path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9L12 3Z"/>','arrow-up-right':'<path d="M6 18 18 6M6 6h12v12"/>',right:'<path d="M5 12h14m-5-5 5 5-5 5"/>',chevron:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m6 9 6 6 6-6"/>',up:'<path d="m5 15 7-7 7 7"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',line:'<path d="M3 17 8 11l5 3 8-9"/>',candles:'<path d="M6 3v4m0 10v4m6-17v7m0 5v5m6-18v3m0 9v6"/><rect x="4" y="7" width="4" height="10" rx=".5"/><rect x="10" y="11" width="4" height="5" rx=".5"/><rect x="16" y="6" width="4" height="9" rx=".5"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8m-8 4h6"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/>',building:'<path d="M3 21h18M5 21V8l7-5 7 5v13M8 9h1m6 0h1M8 13h1m6 0h1m-5 8v-4h2v4"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.2"/>',check:'<path d="m5 12 4 4L19 6"/>',sliders:'<path d="M4 7h6m4 0h6M4 17h10m4 0h2"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',coins:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 4 16 4 16 0V6M4 12v6c0 4 16 4 16 0v-6"/>',leaf:'<path d="M20 3C9 2 3 7 5 14c2 7 14 8 15-11Z"/><path d="M4 21 15 10"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/>',layers:'<path d="m12 3 10 5-10 5L2 8l10-5Zm-9 10 9 5 9-5M3 18l9 5 9-5"/>'};

export const PRESET_STOCKS: Record<string, PresetStock> = {
  BBCA: { color:'#174d96', mark:'BCA', shares:123.275, margin:.49, equityRatio:.16, rev:[['Pendapatan bunga bersih',76],['Provisi & komisi',18],['Pendapatan lain',6]], description:'Bank swasta terkemuka di Indonesia dengan keunggulan transaksi digital, CASA dominan, dan kualitas aset superior.' },
  BBRI: { color:'#315687', mark:'BRI', shares:151.5, margin:.34, equityRatio:.17, rev:[['Pendapatan bunga bersih',82],['Provisi & komisi',13],['Pendapatan lain',5]], description:'Bank BUMN terbesar dengan jaringan mikro terluas di Indonesia (Kupedes & KUR) dan ekosistem holding ultra mikro.' },
  BMRI: { color:'#103b70', mark:'BM', shares:93.33, margin:.38, equityRatio:.18, rev:[['Bunga bersih',78],['Fee & komisi',16],['Treasury',6]], description:'Bank BUMN dengan aset terbesar di Indonesia yang memimpin segmen korporasi dan digital banking Livin by Mandiri.' },
  TLKM: { color:'#b24c5b', mark:'TLK', shares:99.062, margin:.2, equityRatio:.57, rev:[['Seluler & data',61],['Internet rumah',24],['Enterprise & lainnya',15]], description:'Operator telekomunikasi terbesar di Indonesia dengan jaringan Telkomsel dan IndiHome yang dominan secara nasional.' },
  ASII: { color:'#36567c', mark:'A', shares:40.484, margin:.105, equityRatio:.55, rev:[['Otomotif',42],['Alat berat & energi',34],['Jasa keuangan',16],['Lainnya',8]], description:'Konglomerasi terkemuka dengan portofolio otomotif, alat berat & pertambangan (UNTR), jasa keuangan, dan agribisnis.' },
  ICBP: { color:'#526999', mark:'IC', shares:11.662, margin:.145, equityRatio:.56, rev:[['Mi instan',73],['Produk susu',14],['Makanan lainnya',13]], description:'Produsen makanan kemasan terbesar dengan brand global Indomie yang menguasai pangsa pasar mi instan dan dairy.' },
  MIKA: { color:'#20836c', mark:'MK', shares:14.246, margin:.24, equityRatio:.81, rev:[['Rawat inap',57],['Rawat jalan',36],['Layanan lain',7]], description:'Jaringan rumah sakit swasta premium dengan efisiensi operasional tinggi dan neraca keuangan net-cash tanpa utang.' },
  BBNI: { color:'#e0622a', mark:'BNI', shares:37.3, margin:.32, equityRatio:.17, rev:[['Bunga bersih',80],['Fee & komisi',15],['Lainnya',5]], description:'Bank BUMN fokus korporasi tier-1 dan perbankan internasional/global transaksional dengan aplikasi wondr by BNI.' },
  ADRO: { color:'#3d4852', mark:'ADR', shares:31.98, margin:.28, equityRatio:.68, rev:[['Batubara & Energi',85],['Logistik',10],['Lainnya',5]], description:'Grup energi terintegrasi yang bertransformasi ke mineral hijau, energi baru terbarukan, dan smelter aluminium.' },
  GOTO: { color:'#00aa5b', mark:'GT', shares:1200.0, margin:.05, equityRatio:.72, rev:[['On-Demand Services',50],['Financial Technology',45],['Lainnya',5]], description:'Ekosistem digital on-demand (Gojek) dan layanan keuangan digital (GoTo Financial/GoPay) terkemuka di Indonesia.' }
};;

export const TV_LOGOS: Record<string, string> = {"AADI":"adaro-minerals-indonesia-tbk","ACES":"ace-hardware","ADMR":"adaro-minerals-indonesia-tbk","ADRO":"adaro-energy-tbk","AKRA":"akr-corporindo","AMMN":"amman-min-inter-rp-1285","AMRT":"sumber-alfaria-trijaya","ANTM":"antam","ASII":"astra-international","AVIA":"avia-avian-tbk","BBCA":"bank-central-asia","BBNI":"bank-negara-indonesia-persero-tbk","BBRI":"bank-rakyat-indonesia","BBTN":"bank-tabungan-negara","BMRI":"bank-mandiri","BRPT":"barito-pacific","BSDE":"bumi-serpong-damai","BTPS":"bank-btpn","BUKA":"bukalapak","CMRY":"cisarua-mountain-dairy-tbk","CPIN":"charoen-pokphand-indonesia","CTRA":"ciputra-development","CUAN":"petrindo-jaya-kreasi-tbk","DSNG":"dharma-satya-nusantara-tbk","DSSA":"sinarmas-multiartha-tbk","ELSA":"elnusa","EMTK":"elang-mahkota-teknologi-tbk","ENRG":"energi-mega-persada-tbk","ERAA":"erajaya-swasembada","ESSA":"surya-esa-perkasa-tbk","GOTO":"goto-gojek-tokopedia-rp-1","HEAL":"medikaloka-hermina-tbk","HMSP":"h-m-sampoerna","HRTA":"hartadinata-abadi","HRUM":"harum-energy","ICBP":"indofood-cbp","IHSG":"indices/jakarta-composite-index","INCO":"vale","INDF":"indofood","INKP":"indah-kiat-pulp-and-paper","INTP":"indocement-tunggal-prakarsa","ISAT":"indosat","ITMG":"indo-tambangraya-megah","JPFA":"japfa-comfeed-indonesia","JSMR":"jasa-marga-persero","KIJA":"pt-kawasan-industri-jababeka-tbk-80-15-dec-2027","KLBF":"kalbe-farma","KPIG":"mnc-land-tbk","MAPA":"map-aktif-adiperkasa-tbk","MAPI":"mitra-adiperkasa","MEDC":"medco-energi","MIKA":"mitra-keluarga-karyasehat","MTEL":"dayamitra-telekomunikasi","MYOR":"mayora-indah-tbk","PGAS":"perusahaan-gas-negara","PGEO":"pt-pertamina-geothermal-energy-tbk-515-27-apr-2028","PNLF":"panin-financial-tbk","POWR":"cikarang-listrindo-tbk","PTBA":"bukit-asam-tbk","PWON":"pakuwon-jati","RAJA":"rukun-raharja","SCMA":"surya-citra-media","SIDO":"sido-muncul","SMRA":"summarecon-agung","SSMS":"sawit-sumbermas-sarana-tbk","TAPG":"triputra-agro-persada-tbk","TLKM":"telekom-indonesia","TOWR":"sarana-menara-nusantara","UNTR":"united-tractors","UNVR":"unilever","WIFI":"solusi-sinergi-digital-tbk"};

export const FIN_ROWS: Record<string, [string, string, number, boolean?][]> = {income:[['revenue','Pendapatan',2],['pretax','Laba sebelum pajak',2],['net','Laba bersih pemilik induk',2,true],['margin','Margin laba bersih (%)',1],['eps','EPS (Rp / saham)',0,true]],balance:[['assets','Total aset',2,true],['cash','Kas & setara kas',2],['liabilities','Total liabilitas',2],['equity','Ekuitas pemilik induk',2,true],['bvps','Nilai buku / saham (Rp)',0]],cash:[['cfo','Arus kas operasi',2,true],['cfi','Arus kas investasi',2],['cff','Arus kas pendanaan',2],['netCash','Perubahan kas bersih',2],['begin','Kas awal periode',2],['end','Kas akhir periode',2,true],['conversion','Arus kas operasi / laba (%)',1]]};

export const NEWS: NewsItem[] = [
{category:'Kebijakan moneter',icon:'building',title:'Arah suku bunga dan dampaknya ke pasar saham',desc:'Skenario penurunan bunga dapat memengaruhi biaya pendanaan dan minat terhadap saham.',impact:'Perbankan Â· Properti',bias:'Potensi positif',body:'Contoh skenario berita: bank sentral memberi sinyal pelonggaran kebijakan. Dalam simulasi ini, investor memantau kemungkinan perubahan biaya pinjaman dan permintaan kredit. Ini bukan berita atau keputusan bank sentral yang benar-benar diumumkan.',watch:'Hal yang dipantau dalam skenario: keputusan resmi, proyeksi inflasi, dan respons nilai tukar. Respons saham tetap bergantung pada ekspektasi yang sudah tercermin dalam harga.'},
{category:'Pasar global',icon:'globe',title:'Pergerakan rupiah jadi perhatian investor',desc:'Skenario penguatan rupiah mengubah beban impor dan pendapatan berbasis dolar.',impact:'Konsumer Â· Manufaktur',bias:'Dampak beragam',body:'Contoh skenario berita: nilai rupiah menguat terhadap dolar AS. Panel ini mendemonstrasikan bagaimana ringkasan dapat menjelaskan potensi dampak pada emiten yang mengimpor bahan baku dan emiten berorientasi ekspor. Tidak ada kurs aktual yang digunakan.',watch:'Hal yang dipantau dalam skenario: besarnya eksposur mata uang, kebijakan lindung nilai, dan perubahan permintaan. Penguatan mata uang tidak menguntungkan semua sektor secara merata.'},
{category:'Komoditas',icon:'leaf',title:'Harga komoditas mengubah prospek sektor energi',desc:'Skenario kenaikan harga jual membuka ruang perubahan pendapatan dan margin.',impact:'Energi Â· Bahan baku',bias:'Potensi positif',body:'Contoh skenario berita: harga komoditas acuan meningkat. Dashboard menampilkan hubungan antara harga jual, volume produksi, dan biaya usaha. Seluruh narasi ini merupakan konten dummy untuk menguji tampilan, bukan laporan peristiwa terkini.',watch:'Hal yang dipantau dalam skenario: harga realisasi penjualan, volume produksi, biaya tunai, dan durasi kontrak. Kenaikan harga acuan tidak selalu langsung masuk ke laba perusahaan.'}
];

export const INITIAL_EMITENS: EmitenItem[] = [
  {
    "ticker": "AADI",
    "name": "PT Adaro Andalan Indonesia Tbk",
    "sector": "Energi",
    "subsector": "Pertambangan Batubara Termal"
  },
  {
    "ticker": "ACES",
    "name": "PT Aspirasi Hidup Indonesia Tbk",
    "sector": "Konsumer Siklikal",
    "subsector": "Ritel Perbaikan Rumah & Gaya Hidup"
  },
  {
    "ticker": "ADMR",
    "name": "PT Adaro Minerals Indonesia Tbk",
    "sector": "Energi",
    "subsector": "Pertambangan Batubara Metalurgi"
  },
  {
    "ticker": "ADRO",
    "name": "PT Alamtri Resources Indonesia Tbk",
    "sector": "Energi",
    "subsector": "Investasi & Hilirisasi Energi Hijau"
  },
  {
    "ticker": "AKRA",
    "name": "PT AKR Corporindo Tbk",
    "sector": "Energi",
    "subsector": "Distribusi BBM, Logistik & Kawasan Industri"
  },
  {
    "ticker": "AMMN",
    "name": "PT Amman Mineral Internasional Tbk",
    "sector": "Bahan Baku",
    "subsector": "Pertambangan Tembaga & Emas"
  },
  {
    "ticker": "AMRT",
    "name": "PT Sumber Alfaria Trijaya Tbk",
    "sector": "Konsumer Non-Siklikal",
    "subsector": "Ritel Minimarket (Alfamart)"
  },
  {
    "ticker": "ANTM",
    "name": "PT Aneka Tambang Tbk",
    "sector": "Bahan Baku",
    "subsector": "Pertambangan Emas, Nikel & Bauksit"
  },
  {
    "ticker": "ASII",
    "name": "PT Astra International Tbk",
    "sector": "Perindustrian",
    "subsector": "Konglomerasi Otomotif, Alat Berat & Keuangan"
  },
  {
    "ticker": "AVIA",
    "name": "PT Avia Avian Tbk",
    "sector": "Bahan Baku",
    "subsector": "Manufaktur Cat & Bahan Bangunan"
  },
  {
    "ticker": "BBCA",
    "name": "PT Bank Central Asia Tbk",
    "sector": "Keuangan",
    "subsector": "Bank Konvensional"
  },
  {
    "ticker": "BBNI",
    "name": "PT Bank Negara Indonesia (Persero) Tbk",
    "sector": "Keuangan",
    "subsector": "Bank Konvensional"
  },
  {
    "ticker": "BBRI",
    "name": "PT Bank Rakyat Indonesia (Persero) Tbk",
    "sector": "Keuangan",
    "subsector": "Bank Konvensional & Finansial Mikro"
  },
  {
    "ticker": "BBTN",
    "name": "PT Bank Tabungan Negara (Persero) Tbk",
    "sector": "Keuangan",
    "subsector": "Bank Pembiayaan Perumahan (KPR)"
  },
  {
    "ticker": "BMRI",
    "name": "PT Bank Mandiri (Persero) Tbk",
    "sector": "Keuangan",
    "subsector": "Bank Konvensional"
  },
  {
    "ticker": "BRPT",
    "name": "PT Barito Pacific Tbk",
    "sector": "Bahan Baku",
    "subsector": "Petrokimia & Energi Terbarukan"
  },
  {
    "ticker": "BSDE",
    "name": "PT Bumi Serpong Damai Tbk",
    "sector": "Properti & Real Estat",
    "subsector": "Pengembangan Kota Mandiri"
  },
  {
    "ticker": "BTPS",
    "name": "PT Bank BTPN Syariah Tbk",
    "sector": "Keuangan",
    "subsector": "Bank Syariah Finansial Mikro"
  },
  {
    "ticker": "BUKA",
    "name": "PT Bukalapak.com Tbk",
    "sector": "Teknologi",
    "subsector": "E-Commerce & Layanan O2O (Mitra)"
  },
  {
    "ticker": "CMRY",
    "name": "PT Cisarua Mountain Dairy Tbk",
    "sector": "Konsumer Non-Siklikal",
    "subsector": "Olahan Susu & Daging Premium"
  },
  {
    "ticker": "CPIN",
    "name": "PT Charoen Pokphand Indonesia Tbk",
    "sector": "Konsumer Non-Siklikal",
    "subsector": "Pakan Ternak & Perunggasan Terintegrasi"
  },
  {
    "ticker": "CTRA",
    "name": "PT Ciputra Development Tbk",
    "sector": "Properti & Real Estat",
    "subsector": "Pengembangan Residensial & Kota Mandiri"
  },
  {
    "ticker": "CUAN",
    "name": "PT Petrindo Jaya Kreasi Tbk",
    "sector": "Energi",
    "subsector": "Holding Tambang Mineral & Batubara"
  },
  {
    "ticker": "DSNG",
    "name": "PT Dharma Satya Nusantara Tbk",
    "sector": "Konsumer Non-Siklikal",
    "subsector": "Perkebunan Kelapa Sawit & Kayu Olahan"
  },
  {
    "ticker": "DSSA",
    "name": "PT Dian Swastatika Sentosa Tbk",
    "sector": "Energi",
    "subsector": "Pertambangan Batubara, Pembangkit & Teknologi"
  },
  {
    "ticker": "ELSA",
    "name": "PT Elnusa Tbk",
    "sector": "Energi",
    "subsector": "Jasa Penunjang Hulu Migas & Distribusi BBM"
  },
  {
    "ticker": "EMTK",
    "name": "PT Elang Mahkota Teknologi Tbk",
    "sector": "Teknologi",
    "subsector": "Media, Telekomunikasi & Investasi Digital"
  },
  {
    "ticker": "ENRG",
    "name": "PT Energi Mega Persada Tbk",
    "sector": "Energi",
    "subsector": "Eksplorasi & Produksi Minyak dan Gas Bumi"
  },
  {
    "ticker": "ERAA",
    "name": "PT Erajaya Swasembada Tbk",
    "sector": "Konsumer Siklikal",
    "subsector": "Distributor & Ritel Gadget / Elektronik"
  },
  {
    "ticker": "ESSA",
    "name": "PT ESSA Industries Indonesia Tbk",
    "sector": "Bahan Baku",
    "subsector": "Pengolahan Amonia & Kilang LPG"
  },
  {
    "ticker": "HEAL",
    "name": "PT Medikaloka Hermina Tbk",
    "sector": "Kesehatan",
    "subsector": "Layanan Rumah Sakit (Hermina)"
  },
  {
    "ticker": "HMSP",
    "name": "PT H.M. Sampoerna Tbk",
    "sector": "Konsumer Non-Siklikal",
    "subsector": "Manufaktur Rokok & Tembakau"
  },
  {
    "ticker": "HRTA",
    "name": "PT Hartadinata Abadi Tbk",
    "sector": "Konsumer Siklikal",
    "subsector": "Manufaktur & Ritel Perhiasan Emas"
  },
  {
    "ticker": "HRUM",
    "name": "PT Harum Energy Tbk",
    "sector": "Energi",
    "subsector": "Tambang Batubara & Hilirisasi Nikel"
  },
  {
    "ticker": "ICBP",
    "name": "PT Indofood CBP Sukses Makmur Tbk",
    "sector": "Konsumer Non-Siklikal",
    "subsector": "Produsen Makanan Olahan (Indomie)"
  },
  {
    "ticker": "INCO",
    "name": "PT Vale Indonesia Tbk",
    "sector": "Bahan Baku",
    "subsector": "Pertambangan & Pengolahan Nikel Matte"
  },
  {
    "ticker": "INDF",
    "name": "PT Indofood Sukses Makmur Tbk",
    "sector": "Konsumer Non-Siklikal",
    "subsector": "Holding Pangan & Agribisnis Terintegrasi"
  },
  {
    "ticker": "INKP",
    "name": "PT Indah Kiat Pulp & Paper Tbk",
    "sector": "Bahan Baku",
    "subsector": "Manufaktur Bubur Kertas & Kertas Industri"
  },
  {
    "ticker": "INTP",
    "name": "PT Indocement Tunggal Prakarsa Tbk",
    "sector": "Bahan Baku",
    "subsector": "Manufaktur Semen (Tiga Roda)"
  },
  {
    "ticker": "ISAT",
    "name": "PT Indosat Tbk",
    "sector": "Komunikasi",
    "subsector": "Operator Telekomunikasi Seluler"
  },
  {
    "ticker": "ITMG",
    "name": "PT Indo Tambangraya Megah Tbk",
    "sector": "Energi",
    "subsector": "Pertambangan Batubara & Perdagangan Energi"
  },
  {
    "ticker": "JPFA",
    "name": "PT Japfa Comfeed Indonesia Tbk",
    "sector": "Konsumer Non-Siklikal",
    "subsector": "Agri-Food & Peternakan Terintegrasi"
  },
  {
    "ticker": "JSMR",
    "name": "PT Jasa Marga (Persero) Tbk",
    "sector": "Infrastruktur",
    "subsector": "Operator Jalan Tol"
  },
  {
    "ticker": "KIJA",
    "name": "PT Kawasan Industri Jababeka Tbk",
    "sector": "Properti & Real Estat",
    "subsector": "Pengembangan Kawasan Industri Terpadu"
  },
  {
    "ticker": "KLBF",
    "name": "PT Kalbe Farma Tbk",
    "sector": "Kesehatan",
    "subsector": "Farmasi, Nutrisi & Layanan Kesehatan"
  },
  {
    "ticker": "KPIG",
    "name": "PT MNC Land Tbk",
    "sector": "Properti & Real Estat",
    "subsector": "Pengembangan Properti & Hospitality"
  },
  {
    "ticker": "MAPA",
    "name": "PT MAP Aktif Adiperkasa Tbk",
    "sector": "Konsumer Siklikal",
    "subsector": "Ritel Olahraga, Sepatu & Anak (Planet Sports)"
  },
  {
    "ticker": "MAPI",
    "name": "PT Mitra Adiperkasa Tbk",
    "sector": "Konsumer Siklikal",
    "subsector": "Ritel Gaya Hidup, Departemen Store & F&B"
  },
  {
    "ticker": "MEDC",
    "name": "PT Medco Energi Internasional Tbk",
    "sector": "Energi",
    "subsector": "Eksplorasi Migas, Tembaga & Pembangkit Listrik"
  },
  {
    "ticker": "MIKA",
    "name": "PT Mitra Keluarga Karyasehat Tbk",
    "sector": "Kesehatan",
    "subsector": "Layanan Rumah Sakit Swasta"
  },
  {
    "ticker": "MTEL",
    "name": "PT Dayamitra Telekomunikasi Tbk",
    "sector": "Infrastruktur",
    "subsector": "Penyedia Menara Telekomunikasi (Mitratel)"
  },
  {
    "ticker": "MYOR",
    "name": "PT Mayora Indah Tbk",
    "sector": "Konsumer Non-Siklikal",
    "subsector": "Makanan & Minuman Olahan (Kopiko, Torabika)"
  },
  {
    "ticker": "PGAS",
    "name": "PT Perusahaan Gas Negara Tbk",
    "sector": "Energi",
    "subsector": "Transmisi & Distribusi Gas Bumi"
  },
  {
    "ticker": "PGEO",
    "name": "PT Pertamina Geothermal Energy Tbk",
    "sector": "Energi",
    "subsector": "Pembangkit Listrik Panas Bumi (Geotermal)"
  },
  {
    "ticker": "PNLF",
    "name": "PT Panin Financial Tbk",
    "sector": "Keuangan",
    "subsector": "Jasa Asuransi Jiwa & Investasi Keuangan"
  },
  {
    "ticker": "POWR",
    "name": "PT Cikarang Listrindo Tbk",
    "sector": "Utilitas",
    "subsector": "Penyedia Listrik Kawasan Industri (IPP)"
  },
  {
    "ticker": "PTBA",
    "name": "PT Bukit Asam Tbk",
    "sector": "Energi",
    "subsector": "Pertambangan Batubara BUMN"
  },
  {
    "ticker": "PWON",
    "name": "PT Pakuwon Jati Tbk",
    "sector": "Properti & Real Estat",
    "subsector": "Pengembangan Properti Superblok & Mal"
  },
  {
    "ticker": "RAJA",
    "name": "PT Rukun Raharja Tbk",
    "sector": "Energi",
    "subsector": "Infrastruktur & Perdagangan Gas Bumi"
  },
  {
    "ticker": "SCMA",
    "name": "PT Surya Citra Media Tbk",
    "sector": "Komunikasi",
    "subsector": "Media Penyiaran & Platform Streaming"
  },
  {
    "ticker": "SIDO",
    "name": "PT Industri Jamu dan Farmasi Sido Muncul Tbk",
    "sector": "Kesehatan",
    "subsector": "Jamu Herbal & Suplemen Kesehatan"
  },
  {
    "ticker": "SMRA",
    "name": "PT Summarecon Agung Tbk",
    "sector": "Properti & Real Estat",
    "subsector": "Pengembangan Kota Mandiri & Mal Ritel"
  },
  {
    "ticker": "SSMS",
    "name": "PT Sawit Sumbermas Sarana Tbk",
    "sector": "Konsumer Non-Siklikal",
    "subsector": "Perkebunan & Pengolahan Kelapa Sawit"
  },
  {
    "ticker": "TAPG",
    "name": "PT Triputra Agro Persada Tbk",
    "sector": "Konsumer Non-Siklikal",
    "subsector": "Perkebunan Kelapa Sawit & Karet"
  },
  {
    "ticker": "TLKM",
    "name": "PT Telkom Indonesia (Persero) Tbk",
    "sector": "Komunikasi",
    "subsector": "Telekomunikasi Digital & Jaringan Terintegrasi"
  },
  {
    "ticker": "TOWR",
    "name": "PT Sarana Menara Nusantara Tbk",
    "sector": "Infrastruktur",
    "subsector": "Menara Telekomunikasi & Jaringan Fiber Optik"
  },
  {
    "ticker": "UNTR",
    "name": "PT United Tractors Tbk",
    "sector": "Perindustrian",
    "subsector": "Alat Berat, Kontraktor Tambang & Mineral"
  },
  {
    "ticker": "UNVR",
    "name": "PT Unilever Indonesia Tbk",
    "sector": "Konsumer Non-Siklikal",
    "subsector": "Barang Konsumen Cepat Habis (FMCG)"
  },
  {
    "ticker": "WIFI",
    "name": "PT Solusi Sinergi Digital Tbk",
    "sector": "Teknologi",
    "subsector": "Konektivitas Internet & Ekosistem Digital (Surge)"
  }
];

export const INITIAL_EVENTS: CorporateEvent[] = [
  {
    "id": "earn_INKP_20261106",
    "ticker": "INKP",
    "date": "2026-11-06",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan INKP",
    "sub": "Jadwal rilis kinerja kuartalan",
    "amount": "Sesuai publikasi",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Indah Kiat Pulp & Paper Tbk (INKP) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_INTP_20261103",
    "ticker": "INTP",
    "date": "2026-11-03",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan INTP",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp197.8",
    "amount": "Est. EPS Rp197.8",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Indocement Tunggal Prakarsa Tbk (INTP) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_ASII_20261030",
    "ticker": "ASII",
    "date": "2026-10-30",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan ASII",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp178.5",
    "amount": "Est. EPS Rp178.5",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Astra International Tbk (ASII) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_EMTK_20261030",
    "ticker": "EMTK",
    "date": "2026-10-30",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan EMTK",
    "sub": "Jadwal rilis kinerja kuartalan",
    "amount": "Sesuai publikasi",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Elang Mahkota Teknologi Tbk (EMTK) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_INDF_20261030",
    "ticker": "INDF",
    "date": "2026-10-30",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan INDF",
    "sub": "Jadwal rilis kinerja kuartalan",
    "amount": "Sesuai publikasi",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Indofood Sukses Makmur Tbk (INDF) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_JPFA_20261030",
    "ticker": "JPFA",
    "date": "2026-10-30",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan JPFA",
    "sub": "Jadwal rilis kinerja kuartalan",
    "amount": "Sesuai publikasi",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Japfa Comfeed Indonesia Tbk (JPFA) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_BBRI_20261029",
    "ticker": "BBRI",
    "date": "2026-10-29",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan BBRI",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp94.0",
    "amount": "Est. EPS Rp94.0",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Bank Rakyat Indonesia (Persero) Tbk (BBRI) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_BRPT_20261029",
    "ticker": "BRPT",
    "date": "2026-10-29",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan BRPT",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp17.7",
    "amount": "Est. EPS Rp17.7",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Barito Pacific Tbk (BRPT) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_CPIN_20261029",
    "ticker": "CPIN",
    "date": "2026-10-29",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan CPIN",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp57.6",
    "amount": "Est. EPS Rp57.6",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Charoen Pokphand Indonesia Tbk (CPIN) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_ICBP_20261029",
    "ticker": "ICBP",
    "date": "2026-10-29",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan ICBP",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp171.4",
    "amount": "Est. EPS Rp171.4",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Indofood CBP Sukses Makmur Tbk (ICBP) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_TOWR_20261029",
    "ticker": "TOWR",
    "date": "2026-10-29",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan TOWR",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp18.1",
    "amount": "Est. EPS Rp18.1",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Sarana Menara Nusantara Tbk (TOWR) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_TLKM_20261029",
    "ticker": "TLKM",
    "date": "2026-10-29",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan TLKM",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp59.3",
    "amount": "Est. EPS Rp59.3",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Telkom Indonesia (Persero) Tbk (TLKM) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_UNVR_20261029",
    "ticker": "UNVR",
    "date": "2026-10-29",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan UNVR",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp29.0",
    "amount": "Est. EPS Rp29.0",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Unilever Indonesia Tbk (UNVR) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_UNTR_20261029",
    "ticker": "UNTR",
    "date": "2026-10-29",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan UNTR",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp2219.4",
    "amount": "Est. EPS Rp2219.4",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT United Tractors Tbk (UNTR) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_ADRO_20261027",
    "ticker": "ADRO",
    "date": "2026-10-27",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan ADRO",
    "sub": "Jadwal rilis kinerja kuartalan",
    "amount": "Sesuai publikasi",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Alamtri Resources Indonesia Tbk (ADRO) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_ANTM_20261027",
    "ticker": "ANTM",
    "date": "2026-10-27",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan ANTM",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp67.4",
    "amount": "Est. EPS Rp67.4",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Aneka Tambang Tbk (ANTM) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_BUKA_20261027",
    "ticker": "BUKA",
    "date": "2026-10-27",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan BUKA",
    "sub": "Jadwal rilis kinerja kuartalan",
    "amount": "Sesuai publikasi",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Bukalapak.com Tbk (BUKA) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_MIKA_20261027",
    "ticker": "MIKA",
    "date": "2026-10-27",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan MIKA",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp23.0",
    "amount": "Est. EPS Rp23.0",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Mitra Keluarga Karyasehat Tbk (MIKA) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_PWON_20261027",
    "ticker": "PWON",
    "date": "2026-10-27",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan PWON",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp12.1",
    "amount": "Est. EPS Rp12.1",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Pakuwon Jati Tbk (PWON) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_BBNI_20261022",
    "ticker": "BBNI",
    "date": "2026-10-22",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan BBNI",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp138.8",
    "amount": "Est. EPS Rp138.8",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Bank Negara Indonesia (Persero) Tbk (BBNI) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_BMRI_20261022",
    "ticker": "BMRI",
    "date": "2026-10-22",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan BMRI",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp150.1",
    "amount": "Est. EPS Rp150.1",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Bank Mandiri (Persero) Tbk (BMRI) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_BBCA_20261020",
    "ticker": "BBCA",
    "date": "2026-10-20",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan BBCA",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp125.0",
    "amount": "Est. EPS Rp125.0",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Bank Central Asia Tbk (BBCA) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "earn_PGAS_20260922",
    "ticker": "PGAS",
    "date": "2026-09-22",
    "type": "Laporan Keuangan",
    "title": "Rilis Laporan Keuangan PGAS",
    "sub": "Jadwal rilis kinerja kuartalan \u00b7 Est. EPS: Rp0.0",
    "amount": "Est. EPS Rp0.0",
    "note": "Perkiraan tanggal rilis laporan keuangan resmi kuartalan untuk PT Perusahaan Gas Negara Tbk (PGAS) berdasarkan kalender resmi Yahoo Finance."
  },
  {
    "id": "div_BMRI_20260916",
    "ticker": "BMRI",
    "date": "2026-09-16",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BMRI",
    "sub": "Dividen Rp66 per lembar saham",
    "amount": "Rp66 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bank Mandiri (Persero) Tbk (BMRI) sebesar Rp66 per lembar saham."
  },
  {
    "id": "div_CMRY_20260904",
    "ticker": "CMRY",
    "date": "2026-09-04",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai CMRY",
    "sub": "Dividen Rp100 per lembar saham",
    "amount": "Rp100 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Cisarua Mountain Dairy Tbk (CMRY) sebesar Rp100 per lembar saham."
  },
  {
    "id": "div_BBCA_20260831",
    "ticker": "BBCA",
    "date": "2026-08-31",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BBCA",
    "sub": "Dividen Rp25 per lembar saham",
    "amount": "Rp25 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bank Central Asia Tbk (BBCA) sebesar Rp25 per lembar saham."
  },
  {
    "id": "div_TAPG_20260812",
    "ticker": "TAPG",
    "date": "2026-08-12",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai TAPG",
    "sub": "Dividen Rp60 per lembar saham",
    "amount": "Rp60 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Triputra Agro Persada Tbk (TAPG) sebesar Rp60 per lembar saham."
  },
  {
    "id": "div_AKRA_20260803",
    "ticker": "AKRA",
    "date": "2026-08-03",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai AKRA",
    "sub": "Dividen Rp50 per lembar saham",
    "amount": "Rp50 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT AKR Corporindo Tbk (AKRA) sebesar Rp50 per lembar saham."
  },
  {
    "id": "div_WIFI_20260709",
    "ticker": "WIFI",
    "date": "2026-07-09",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai WIFI",
    "sub": "Dividen Rp2 per lembar saham",
    "amount": "Rp2 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Solusi Sinergi Digital Tbk (WIFI) sebesar Rp2 per lembar saham."
  },
  {
    "id": "div_ERAA_20260708",
    "ticker": "ERAA",
    "date": "2026-07-08",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ERAA",
    "sub": "Dividen Rp25 per lembar saham",
    "amount": "Rp25 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Erajaya Swasembada Tbk (ERAA) sebesar Rp25 per lembar saham."
  },
  {
    "id": "div_CTRA_20260707",
    "ticker": "CTRA",
    "date": "2026-07-07",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai CTRA",
    "sub": "Dividen Rp36 per lembar saham",
    "amount": "Rp36 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Ciputra Development Tbk (CTRA) sebesar Rp36 per lembar saham."
  },
  {
    "id": "div_ICBP_20260707",
    "ticker": "ICBP",
    "date": "2026-07-07",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ICBP",
    "sub": "Dividen Rp265 per lembar saham",
    "amount": "Rp265 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Indofood CBP Sukses Makmur Tbk (ICBP) sebesar Rp265 per lembar saham."
  },
  {
    "id": "div_INDF_20260707",
    "ticker": "INDF",
    "date": "2026-07-07",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai INDF",
    "sub": "Dividen Rp290 per lembar saham",
    "amount": "Rp290 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Indofood Sukses Makmur Tbk (INDF) sebesar Rp290 per lembar saham."
  },
  {
    "id": "div_MTEL_20260707",
    "ticker": "MTEL",
    "date": "2026-07-07",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai MTEL",
    "sub": "Dividen Rp25.65 per lembar saham",
    "amount": "Rp25.65 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Dayamitra Telekomunikasi Tbk (MTEL) sebesar Rp25.65 per lembar saham."
  },
  {
    "id": "div_BRPT_20260706",
    "ticker": "BRPT",
    "date": "2026-07-06",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BRPT",
    "sub": "Dividen Rp1.63 per lembar saham",
    "amount": "Rp1.63 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Barito Pacific Tbk (BRPT) sebesar Rp1.63 per lembar saham."
  },
  {
    "id": "div_MAPA_20260703",
    "ticker": "MAPA",
    "date": "2026-07-03",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai MAPA",
    "sub": "Dividen Rp4 per lembar saham",
    "amount": "Rp4 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT MAP Aktif Adiperkasa Tbk (MAPA) sebesar Rp4 per lembar saham."
  },
  {
    "id": "div_MAPI_20260703",
    "ticker": "MAPI",
    "date": "2026-07-03",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai MAPI",
    "sub": "Dividen Rp10 per lembar saham",
    "amount": "Rp10 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Mitra Adiperkasa Tbk (MAPI) sebesar Rp10 per lembar saham."
  },
  {
    "id": "div_INKP_20260702",
    "ticker": "INKP",
    "date": "2026-07-02",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai INKP",
    "sub": "Dividen Rp75 per lembar saham",
    "amount": "Rp75 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Indah Kiat Pulp & Paper Tbk (INKP) sebesar Rp75 per lembar saham."
  },
  {
    "id": "div_RAJA_20260702",
    "ticker": "RAJA",
    "date": "2026-07-02",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai RAJA",
    "sub": "Dividen Rp8 per lembar saham",
    "amount": "Rp8 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Rukun Raharja Tbk (RAJA) sebesar Rp8 per lembar saham."
  },
  {
    "id": "div_ESSA_20260629",
    "ticker": "ESSA",
    "date": "2026-06-29",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ESSA",
    "sub": "Dividen Rp52 per lembar saham",
    "amount": "Rp52 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT ESSA Industries Indonesia Tbk (ESSA) sebesar Rp52 per lembar saham."
  },
  {
    "id": "div_PTBA_20260623",
    "ticker": "PTBA",
    "date": "2026-06-23",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai PTBA",
    "sub": "Dividen Rp114.51 per lembar saham",
    "amount": "Rp114.51 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bukit Asam Tbk (PTBA) sebesar Rp114.51 per lembar saham."
  },
  {
    "id": "div_PWON_20260623",
    "ticker": "PWON",
    "date": "2026-06-23",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai PWON",
    "sub": "Dividen Rp13 per lembar saham",
    "amount": "Rp13 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Pakuwon Jati Tbk (PWON) sebesar Rp13 per lembar saham."
  },
  {
    "id": "div_SMRA_20260623",
    "ticker": "SMRA",
    "date": "2026-06-23",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai SMRA",
    "sub": "Dividen Rp5 per lembar saham",
    "amount": "Rp5 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Summarecon Agung Tbk (SMRA) sebesar Rp5 per lembar saham."
  },
  {
    "id": "div_ACES_20260622",
    "ticker": "ACES",
    "date": "2026-06-22",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ACES",
    "sub": "Dividen Rp32.01 per lembar saham",
    "amount": "Rp32.01 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Aspirasi Hidup Indonesia Tbk (ACES) sebesar Rp32.01 per lembar saham."
  },
  {
    "id": "div_ANTM_20260622",
    "ticker": "ANTM",
    "date": "2026-06-22",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ANTM",
    "sub": "Dividen Rp209.99 per lembar saham",
    "amount": "Rp209.99 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Aneka Tambang Tbk (ANTM) sebesar Rp209.99 per lembar saham."
  },
  {
    "id": "div_DSNG_20260619",
    "ticker": "DSNG",
    "date": "2026-06-19",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai DSNG",
    "sub": "Dividen Rp47 per lembar saham",
    "amount": "Rp47 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Dharma Satya Nusantara Tbk (DSNG) sebesar Rp47 per lembar saham."
  },
  {
    "id": "div_MIKA_20260619",
    "ticker": "MIKA",
    "date": "2026-06-19",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai MIKA",
    "sub": "Dividen Rp43 per lembar saham",
    "amount": "Rp43 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Mitra Keluarga Karyasehat Tbk (MIKA) sebesar Rp43 per lembar saham."
  },
  {
    "id": "div_ELSA_20260618",
    "ticker": "ELSA",
    "date": "2026-06-18",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ELSA",
    "sub": "Dividen Rp44.29 per lembar saham",
    "amount": "Rp44.29 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Elnusa Tbk (ELSA) sebesar Rp44.29 per lembar saham."
  },
  {
    "id": "div_TLKM_20260618",
    "ticker": "TLKM",
    "date": "2026-06-18",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai TLKM",
    "sub": "Dividen Rp223.17 per lembar saham",
    "amount": "Rp223.17 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Telkom Indonesia (Persero) Tbk (TLKM) sebesar Rp223.17 per lembar saham."
  },
  {
    "id": "div_BBCA_20260617",
    "ticker": "BBCA",
    "date": "2026-06-17",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BBCA",
    "sub": "Dividen Rp20 per lembar saham",
    "amount": "Rp20 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bank Central Asia Tbk (BBCA) sebesar Rp20 per lembar saham."
  },
  {
    "id": "div_KIJA_20260617",
    "ticker": "KIJA",
    "date": "2026-06-17",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai KIJA",
    "sub": "Dividen Rp2.03 per lembar saham",
    "amount": "Rp2.03 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Kawasan Industri Jababeka Tbk (KIJA) sebesar Rp2.03 per lembar saham."
  },
  {
    "id": "div_AMRT_20260615",
    "ticker": "AMRT",
    "date": "2026-06-15",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai AMRT",
    "sub": "Dividen Rp41.50 per lembar saham",
    "amount": "Rp41.50 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Sumber Alfaria Trijaya Tbk (AMRT) sebesar Rp41.50 per lembar saham."
  },
  {
    "id": "div_MEDC_20260615",
    "ticker": "MEDC",
    "date": "2026-06-15",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai MEDC",
    "sub": "Dividen Rp32.25 per lembar saham",
    "amount": "Rp32.25 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Medco Energi Internasional Tbk (MEDC) sebesar Rp32.25 per lembar saham."
  },
  {
    "id": "div_MYOR_20260615",
    "ticker": "MYOR",
    "date": "2026-06-15",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai MYOR",
    "sub": "Dividen Rp60 per lembar saham",
    "amount": "Rp60 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Mayora Indah Tbk (MYOR) sebesar Rp60 per lembar saham."
  },
  {
    "id": "div_UNVR_20260615",
    "ticker": "UNVR",
    "date": "2026-06-15",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai UNVR",
    "sub": "Dividen Rp114 per lembar saham",
    "amount": "Rp114 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Unilever Indonesia Tbk (UNVR) sebesar Rp114 per lembar saham."
  },
  {
    "id": "div_HRTA_20260612",
    "ticker": "HRTA",
    "date": "2026-06-12",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai HRTA",
    "sub": "Dividen Rp40 per lembar saham",
    "amount": "Rp40 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Hartadinata Abadi Tbk (HRTA) sebesar Rp40 per lembar saham."
  },
  {
    "id": "div_INCO_20260611",
    "ticker": "INCO",
    "date": "2026-06-11",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai INCO",
    "sub": "Dividen Rp77.90 per lembar saham",
    "amount": "Rp77.90 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Vale Indonesia Tbk (INCO) sebesar Rp77.90 per lembar saham."
  },
  {
    "id": "div_AADI_20260605",
    "ticker": "AADI",
    "date": "2026-06-05",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai AADI",
    "sub": "Dividen Rp463.32 per lembar saham",
    "amount": "Rp463.32 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Adaro Andalan Indonesia Tbk (AADI) sebesar Rp463.32 per lembar saham."
  },
  {
    "id": "div_PGAS_20260605",
    "ticker": "PGAS",
    "date": "2026-06-05",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai PGAS",
    "sub": "Dividen Rp125.61 per lembar saham",
    "amount": "Rp125.61 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Perusahaan Gas Negara Tbk (PGAS) sebesar Rp125.61 per lembar saham."
  },
  {
    "id": "div_TAPG_20260605",
    "ticker": "TAPG",
    "date": "2026-06-05",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai TAPG",
    "sub": "Dividen Rp91 per lembar saham",
    "amount": "Rp91 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Triputra Agro Persada Tbk (TAPG) sebesar Rp91 per lembar saham."
  },
  {
    "id": "div_EMTK_20260604",
    "ticker": "EMTK",
    "date": "2026-06-04",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai EMTK",
    "sub": "Dividen Rp5 per lembar saham",
    "amount": "Rp5 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Elang Mahkota Teknologi Tbk (EMTK) sebesar Rp5 per lembar saham."
  },
  {
    "id": "div_INTP_20260604",
    "ticker": "INTP",
    "date": "2026-06-04",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai INTP",
    "sub": "Dividen Rp468 per lembar saham",
    "amount": "Rp468 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Indocement Tunggal Prakarsa Tbk (INTP) sebesar Rp468 per lembar saham."
  },
  {
    "id": "div_KLBF_20260604",
    "ticker": "KLBF",
    "date": "2026-06-04",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai KLBF",
    "sub": "Dividen Rp20 per lembar saham",
    "amount": "Rp20 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Kalbe Farma Tbk (KLBF) sebesar Rp20 per lembar saham."
  },
  {
    "id": "div_SCMA_20260604",
    "ticker": "SCMA",
    "date": "2026-06-04",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai SCMA",
    "sub": "Dividen Rp12 per lembar saham",
    "amount": "Rp12 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Surya Citra Media Tbk (SCMA) sebesar Rp12 per lembar saham."
  },
  {
    "id": "div_CPIN_20260603",
    "ticker": "CPIN",
    "date": "2026-06-03",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai CPIN",
    "sub": "Dividen Rp180 per lembar saham",
    "amount": "Rp180 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Charoen Pokphand Indonesia Tbk (CPIN) sebesar Rp180 per lembar saham."
  },
  {
    "id": "div_JSMR_20260603",
    "ticker": "JSMR",
    "date": "2026-06-03",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai JSMR",
    "sub": "Dividen Rp156.23 per lembar saham",
    "amount": "Rp156.23 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Jasa Marga (Persero) Tbk (JSMR) sebesar Rp156.23 per lembar saham."
  },
  {
    "id": "div_TOWR_20260603",
    "ticker": "TOWR",
    "date": "2026-06-03",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai TOWR",
    "sub": "Dividen Rp6.89 per lembar saham",
    "amount": "Rp6.89 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Sarana Menara Nusantara Tbk (TOWR) sebesar Rp6.89 per lembar saham."
  },
  {
    "id": "div_HMSP_20260529",
    "ticker": "HMSP",
    "date": "2026-05-29",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai HMSP",
    "sub": "Dividen Rp56.30 per lembar saham",
    "amount": "Rp56.30 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT H.M. Sampoerna Tbk (HMSP) sebesar Rp56.30 per lembar saham."
  },
  {
    "id": "div_POWR_20260521",
    "ticker": "POWR",
    "date": "2026-05-21",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai POWR",
    "sub": "Dividen Rp49.53 per lembar saham",
    "amount": "Rp49.53 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Cikarang Listrindo Tbk (POWR) sebesar Rp49.53 per lembar saham."
  },
  {
    "id": "div_ISAT_20260518",
    "ticker": "ISAT",
    "date": "2026-05-18",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ISAT",
    "sub": "Dividen Rp111 per lembar saham",
    "amount": "Rp111 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Indosat Tbk (ISAT) sebesar Rp111 per lembar saham."
  },
  {
    "id": "div_SSMS_20260512",
    "ticker": "SSMS",
    "date": "2026-05-12",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai SSMS",
    "sub": "Dividen Rp83.99 per lembar saham",
    "amount": "Rp83.99 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Sawit Sumbermas Sarana Tbk (SSMS) sebesar Rp83.99 per lembar saham."
  },
  {
    "id": "div_BMRI_20260511",
    "ticker": "BMRI",
    "date": "2026-05-11",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BMRI",
    "sub": "Dividen Rp376.96 per lembar saham",
    "amount": "Rp376.96 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bank Mandiri (Persero) Tbk (BMRI) sebesar Rp376.96 per lembar saham."
  },
  {
    "id": "div_JPFA_20260511",
    "ticker": "JPFA",
    "date": "2026-05-11",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai JPFA",
    "sub": "Dividen Rp140 per lembar saham",
    "amount": "Rp140 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Japfa Comfeed Indonesia Tbk (JPFA) sebesar Rp140 per lembar saham."
  },
  {
    "id": "div_AKRA_20260507",
    "ticker": "AKRA",
    "date": "2026-05-07",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai AKRA",
    "sub": "Dividen Rp50 per lembar saham",
    "amount": "Rp50 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT AKR Corporindo Tbk (AKRA) sebesar Rp50 per lembar saham."
  },
  {
    "id": "div_ASII_20260505",
    "ticker": "ASII",
    "date": "2026-05-05",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ASII",
    "sub": "Dividen Rp292 per lembar saham",
    "amount": "Rp292 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Astra International Tbk (ASII) sebesar Rp292 per lembar saham."
  },
  {
    "id": "div_HEAL_20260505",
    "ticker": "HEAL",
    "date": "2026-05-05",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai HEAL",
    "sub": "Dividen Rp13.50 per lembar saham",
    "amount": "Rp13.50 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Medikaloka Hermina Tbk (HEAL) sebesar Rp13.50 per lembar saham."
  },
  {
    "id": "div_PGEO_20260430",
    "ticker": "PGEO",
    "date": "2026-04-30",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai PGEO",
    "sub": "Dividen Rp49.44 per lembar saham",
    "amount": "Rp49.44 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Pertamina Geothermal Energy Tbk (PGEO) sebesar Rp49.44 per lembar saham."
  },
  {
    "id": "div_ADMR_20260428",
    "ticker": "ADMR",
    "date": "2026-04-28",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ADMR",
    "sub": "Dividen Rp50.62 per lembar saham",
    "amount": "Rp50.62 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Adaro Minerals Indonesia Tbk (ADMR) sebesar Rp50.62 per lembar saham."
  },
  {
    "id": "div_ADRO_20260428",
    "ticker": "ADRO",
    "date": "2026-04-28",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ADRO",
    "sub": "Dividen Rp118.26 per lembar saham",
    "amount": "Rp118.26 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Alamtri Resources Indonesia Tbk (ADRO) sebesar Rp118.26 per lembar saham."
  },
  {
    "id": "div_ITMG_20260428",
    "ticker": "ITMG",
    "date": "2026-04-28",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ITMG",
    "sub": "Dividen Rp992 per lembar saham",
    "amount": "Rp992 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Indo Tambangraya Megah Tbk (ITMG) sebesar Rp992 per lembar saham."
  },
  {
    "id": "div_BTPS_20260427",
    "ticker": "BTPS",
    "date": "2026-04-27",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BTPS",
    "sub": "Dividen Rp46.20 per lembar saham",
    "amount": "Rp46.20 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bank BTPN Syariah Tbk (BTPS) sebesar Rp46.20 per lembar saham."
  },
  {
    "id": "div_UNTR_20260427",
    "ticker": "UNTR",
    "date": "2026-04-27",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai UNTR",
    "sub": "Dividen Rp1,096 per lembar saham",
    "amount": "Rp1,096 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT United Tractors Tbk (UNTR) sebesar Rp1,096 per lembar saham."
  },
  {
    "id": "div_BBRI_20260421",
    "ticker": "BBRI",
    "date": "2026-04-21",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BBRI",
    "sub": "Dividen Rp209 per lembar saham",
    "amount": "Rp209 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bank Rakyat Indonesia (Persero) Tbk (BBRI) sebesar Rp209 per lembar saham."
  },
  {
    "id": "div_AVIA_20260420",
    "ticker": "AVIA",
    "date": "2026-04-20",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai AVIA",
    "sub": "Dividen Rp12 per lembar saham",
    "amount": "Rp12 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Avia Avian Tbk (AVIA) sebesar Rp12 per lembar saham."
  },
  {
    "id": "div_CMRY_20260420",
    "ticker": "CMRY",
    "date": "2026-04-20",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai CMRY",
    "sub": "Dividen Rp100 per lembar saham",
    "amount": "Rp100 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Cisarua Mountain Dairy Tbk (CMRY) sebesar Rp100 per lembar saham."
  },
  {
    "id": "div_SIDO_20260420",
    "ticker": "SIDO",
    "date": "2026-04-20",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai SIDO",
    "sub": "Dividen Rp15 per lembar saham",
    "amount": "Rp15 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Industri Jamu dan Farmasi Sido Muncul Tbk (SIDO) sebesar Rp15 per lembar saham."
  },
  {
    "id": "div_BBNI_20260325",
    "ticker": "BBNI",
    "date": "2026-03-25",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BBNI",
    "sub": "Dividen Rp349.41 per lembar saham",
    "amount": "Rp349.41 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bank Negara Indonesia (Persero) Tbk (BBNI) sebesar Rp349.41 per lembar saham."
  },
  {
    "id": "div_RAJA_20260109",
    "ticker": "RAJA",
    "date": "2026-01-09",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai RAJA",
    "sub": "Dividen Rp5 per lembar saham",
    "amount": "Rp5 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Rukun Raharja Tbk (RAJA) sebesar Rp5 per lembar saham."
  },
  {
    "id": "div_ADRO_20251230",
    "ticker": "ADRO",
    "date": "2025-12-30",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ADRO",
    "sub": "Dividen Rp145.14 per lembar saham",
    "amount": "Rp145.14 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Alamtri Resources Indonesia Tbk (ADRO) sebesar Rp145.14 per lembar saham."
  },
  {
    "id": "div_BBRI_20251230",
    "ticker": "BBRI",
    "date": "2025-12-30",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BBRI",
    "sub": "Dividen Rp137 per lembar saham",
    "amount": "Rp137 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bank Rakyat Indonesia (Persero) Tbk (BBRI) sebesar Rp137 per lembar saham."
  },
  {
    "id": "div_UNVR_20251215",
    "ticker": "UNVR",
    "date": "2025-12-15",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai UNVR",
    "sub": "Dividen Rp87 per lembar saham",
    "amount": "Rp87 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Unilever Indonesia Tbk (UNVR) sebesar Rp87 per lembar saham."
  },
  {
    "id": "div_TOWR_20251210",
    "ticker": "TOWR",
    "date": "2025-12-10",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai TOWR",
    "sub": "Dividen Rp6.87 per lembar saham",
    "amount": "Rp6.87 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Sarana Menara Nusantara Tbk (TOWR) sebesar Rp6.87 per lembar saham."
  },
  {
    "id": "div_BTPS_20251128",
    "ticker": "BTPS",
    "date": "2025-11-28",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BTPS",
    "sub": "Dividen Rp39.50 per lembar saham",
    "amount": "Rp39.50 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bank BTPN Syariah Tbk (BTPS) sebesar Rp39.50 per lembar saham."
  },
  {
    "id": "div_POWR_20251125",
    "ticker": "POWR",
    "date": "2025-11-25",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai POWR",
    "sub": "Dividen Rp24.21 per lembar saham",
    "amount": "Rp24.21 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Cikarang Listrindo Tbk (POWR) sebesar Rp24.21 per lembar saham."
  },
  {
    "id": "div_EMTK_20251120",
    "ticker": "EMTK",
    "date": "2025-11-20",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai EMTK",
    "sub": "Dividen Rp5 per lembar saham",
    "amount": "Rp5 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Elang Mahkota Teknologi Tbk (EMTK) sebesar Rp5 per lembar saham."
  },
  {
    "id": "div_SCMA_20251119",
    "ticker": "SCMA",
    "date": "2025-11-19",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai SCMA",
    "sub": "Dividen Rp9 per lembar saham",
    "amount": "Rp9 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Surya Citra Media Tbk (SCMA) sebesar Rp9 per lembar saham."
  },
  {
    "id": "div_AADI_20251118",
    "ticker": "AADI",
    "date": "2025-11-18",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai AADI",
    "sub": "Dividen Rp538.08 per lembar saham",
    "amount": "Rp538.08 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Adaro Andalan Indonesia Tbk (AADI) sebesar Rp538.08 per lembar saham."
  },
  {
    "id": "div_ITMG_20251113",
    "ticker": "ITMG",
    "date": "2025-11-13",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ITMG",
    "sub": "Dividen Rp738 per lembar saham",
    "amount": "Rp738 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Indo Tambangraya Megah Tbk (ITMG) sebesar Rp738 per lembar saham."
  },
  {
    "id": "div_AVIA_20251112",
    "ticker": "AVIA",
    "date": "2025-11-12",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai AVIA",
    "sub": "Dividen Rp11 per lembar saham",
    "amount": "Rp11 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Avia Avian Tbk (AVIA) sebesar Rp11 per lembar saham."
  },
  {
    "id": "div_MEDC_20251111",
    "ticker": "MEDC",
    "date": "2025-11-11",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai MEDC",
    "sub": "Dividen Rp28.45 per lembar saham",
    "amount": "Rp28.45 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Medco Energi Internasional Tbk (MEDC) sebesar Rp28.45 per lembar saham."
  },
  {
    "id": "div_SIDO_20251111",
    "ticker": "SIDO",
    "date": "2025-11-11",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai SIDO",
    "sub": "Dividen Rp22 per lembar saham",
    "amount": "Rp22 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Industri Jamu dan Farmasi Sido Muncul Tbk (SIDO) sebesar Rp22 per lembar saham."
  },
  {
    "id": "div_ASII_20251014",
    "ticker": "ASII",
    "date": "2025-10-14",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ASII",
    "sub": "Dividen Rp98 per lembar saham",
    "amount": "Rp98 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Astra International Tbk (ASII) sebesar Rp98 per lembar saham."
  },
  {
    "id": "div_UNTR_20251008",
    "ticker": "UNTR",
    "date": "2025-10-08",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai UNTR",
    "sub": "Dividen Rp567 per lembar saham",
    "amount": "Rp567 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT United Tractors Tbk (UNTR) sebesar Rp567 per lembar saham."
  },
  {
    "id": "div_MAPA_20250709",
    "ticker": "MAPA",
    "date": "2025-07-09",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai MAPA",
    "sub": "Dividen Rp4 per lembar saham",
    "amount": "Rp4 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT MAP Aktif Adiperkasa Tbk (MAPA) sebesar Rp4 per lembar saham."
  },
  {
    "id": "div_MAPI_20250709",
    "ticker": "MAPI",
    "date": "2025-07-09",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai MAPI",
    "sub": "Dividen Rp10 per lembar saham",
    "amount": "Rp10 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Mitra Adiperkasa Tbk (MAPI) sebesar Rp10 per lembar saham."
  },
  {
    "id": "div_KIJA_20250707",
    "ticker": "KIJA",
    "date": "2025-07-07",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai KIJA",
    "sub": "Dividen Rp1.77 per lembar saham",
    "amount": "Rp1.77 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Kawasan Industri Jababeka Tbk (KIJA) sebesar Rp1.77 per lembar saham."
  },
  {
    "id": "div_PWON_20250707",
    "ticker": "PWON",
    "date": "2025-07-07",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai PWON",
    "sub": "Dividen Rp13 per lembar saham",
    "amount": "Rp13 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Pakuwon Jati Tbk (PWON) sebesar Rp13 per lembar saham."
  },
  {
    "id": "div_ICBP_20250702",
    "ticker": "ICBP",
    "date": "2025-07-02",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ICBP",
    "sub": "Dividen Rp250 per lembar saham",
    "amount": "Rp250 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Indofood CBP Sukses Makmur Tbk (ICBP) sebesar Rp250 per lembar saham."
  },
  {
    "id": "div_INDF_20250702",
    "ticker": "INDF",
    "date": "2025-07-02",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai INDF",
    "sub": "Dividen Rp280 per lembar saham",
    "amount": "Rp280 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Indofood Sukses Makmur Tbk (INDF) sebesar Rp280 per lembar saham."
  },
  {
    "id": "div_ACES_20250626",
    "ticker": "ACES",
    "date": "2025-06-26",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ACES",
    "sub": "Dividen Rp33.87 per lembar saham",
    "amount": "Rp33.87 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Aspirasi Hidup Indonesia Tbk (ACES) sebesar Rp33.87 per lembar saham."
  },
  {
    "id": "div_CTRA_20250626",
    "ticker": "CTRA",
    "date": "2025-06-26",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai CTRA",
    "sub": "Dividen Rp24 per lembar saham",
    "amount": "Rp24 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Ciputra Development Tbk (CTRA) sebesar Rp24 per lembar saham."
  },
  {
    "id": "div_INKP_20250625",
    "ticker": "INKP",
    "date": "2025-06-25",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai INKP",
    "sub": "Dividen Rp50 per lembar saham",
    "amount": "Rp50 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Indah Kiat Pulp & Paper Tbk (INKP) sebesar Rp50 per lembar saham."
  },
  {
    "id": "div_ANTM_20250623",
    "ticker": "ANTM",
    "date": "2025-06-23",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ANTM",
    "sub": "Dividen Rp151.77 per lembar saham",
    "amount": "Rp151.77 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Aneka Tambang Tbk (ANTM) sebesar Rp151.77 per lembar saham."
  },
  {
    "id": "div_HRTA_20250623",
    "ticker": "HRTA",
    "date": "2025-06-23",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai HRTA",
    "sub": "Dividen Rp21 per lembar saham",
    "amount": "Rp21 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Hartadinata Abadi Tbk (HRTA) sebesar Rp21 per lembar saham."
  },
  {
    "id": "div_PTBA_20250623",
    "ticker": "PTBA",
    "date": "2025-06-23",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai PTBA",
    "sub": "Dividen Rp332.44 per lembar saham",
    "amount": "Rp332.44 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bukit Asam Tbk (PTBA) sebesar Rp332.44 per lembar saham."
  },
  {
    "id": "div_WIFI_20250623",
    "ticker": "WIFI",
    "date": "2025-06-23",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai WIFI",
    "sub": "Dividen Rp2 per lembar saham",
    "amount": "Rp2 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Solusi Sinergi Digital Tbk (WIFI) sebesar Rp2 per lembar saham."
  },
  {
    "id": "div_SMRA_20250623",
    "ticker": "SMRA",
    "date": "2025-06-23",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai SMRA",
    "sub": "Dividen Rp9 per lembar saham",
    "amount": "Rp9 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Summarecon Agung Tbk (SMRA) sebesar Rp9 per lembar saham."
  },
  {
    "id": "div_ERAA_20250619",
    "ticker": "ERAA",
    "date": "2025-06-19",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ERAA",
    "sub": "Dividen Rp19 per lembar saham",
    "amount": "Rp19 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Erajaya Swasembada Tbk (ERAA) sebesar Rp19 per lembar saham."
  },
  {
    "id": "div_MYOR_20250619",
    "ticker": "MYOR",
    "date": "2025-06-19",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai MYOR",
    "sub": "Dividen Rp55 per lembar saham",
    "amount": "Rp55 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Mayora Indah Tbk (MYOR) sebesar Rp55 per lembar saham."
  },
  {
    "id": "div_DSNG_20250618",
    "ticker": "DSNG",
    "date": "2025-06-18",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai DSNG",
    "sub": "Dividen Rp24 per lembar saham",
    "amount": "Rp24 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Dharma Satya Nusantara Tbk (DSNG) sebesar Rp24 per lembar saham."
  },
  {
    "id": "div_MIKA_20250617",
    "ticker": "MIKA",
    "date": "2025-06-17",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai MIKA",
    "sub": "Dividen Rp43 per lembar saham",
    "amount": "Rp43 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Mitra Keluarga Karyasehat Tbk (MIKA) sebesar Rp43 per lembar saham."
  },
  {
    "id": "div_PGEO_20250616",
    "ticker": "PGEO",
    "date": "2025-06-16",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai PGEO",
    "sub": "Dividen Rp53.09 per lembar saham",
    "amount": "Rp53.09 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Pertamina Geothermal Energy Tbk (PGEO) sebesar Rp53.09 per lembar saham."
  },
  {
    "id": "div_ADMR_20250613",
    "ticker": "ADMR",
    "date": "2025-06-13",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ADMR",
    "sub": "Dividen Rp47.82 per lembar saham",
    "amount": "Rp47.82 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Adaro Minerals Indonesia Tbk (ADMR) sebesar Rp47.82 per lembar saham."
  },
  {
    "id": "div_ISAT_20250612",
    "ticker": "ISAT",
    "date": "2025-06-12",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ISAT",
    "sub": "Dividen Rp83.80 per lembar saham",
    "amount": "Rp83.80 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Indosat Tbk (ISAT) sebesar Rp83.80 per lembar saham."
  },
  {
    "id": "div_MTEL_20250612",
    "ticker": "MTEL",
    "date": "2025-06-12",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai MTEL",
    "sub": "Dividen Rp25.33 per lembar saham",
    "amount": "Rp25.33 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Dayamitra Telekomunikasi Tbk (MTEL) sebesar Rp25.33 per lembar saham."
  },
  {
    "id": "div_PGAS_20250612",
    "ticker": "PGAS",
    "date": "2025-06-12",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai PGAS",
    "sub": "Dividen Rp182.08 per lembar saham",
    "amount": "Rp182.08 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Perusahaan Gas Negara Tbk (PGAS) sebesar Rp182.08 per lembar saham."
  },
  {
    "id": "div_HMSP_20250611",
    "ticker": "HMSP",
    "date": "2025-06-11",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai HMSP",
    "sub": "Dividen Rp56.20 per lembar saham",
    "amount": "Rp56.20 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT H.M. Sampoerna Tbk (HMSP) sebesar Rp56.20 per lembar saham."
  },
  {
    "id": "div_TLKM_20250611",
    "ticker": "TLKM",
    "date": "2025-06-11",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai TLKM",
    "sub": "Dividen Rp212.47 per lembar saham",
    "amount": "Rp212.47 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Telkom Indonesia (Persero) Tbk (TLKM) sebesar Rp212.47 per lembar saham."
  },
  {
    "id": "div_AMRT_20250604",
    "ticker": "AMRT",
    "date": "2025-06-04",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai AMRT",
    "sub": "Dividen Rp34.11 per lembar saham",
    "amount": "Rp34.11 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Sumber Alfaria Trijaya Tbk (AMRT) sebesar Rp34.11 per lembar saham."
  },
  {
    "id": "div_ELSA_20250604",
    "ticker": "ELSA",
    "date": "2025-06-04",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ELSA",
    "sub": "Dividen Rp39.11 per lembar saham",
    "amount": "Rp39.11 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Elnusa Tbk (ELSA) sebesar Rp39.11 per lembar saham."
  },
  {
    "id": "div_KLBF_20250604",
    "ticker": "KLBF",
    "date": "2025-06-04",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai KLBF",
    "sub": "Dividen Rp36 per lembar saham",
    "amount": "Rp36 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Kalbe Farma Tbk (KLBF) sebesar Rp36 per lembar saham."
  },
  {
    "id": "div_CPIN_20250603",
    "ticker": "CPIN",
    "date": "2025-06-03",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai CPIN",
    "sub": "Dividen Rp108 per lembar saham",
    "amount": "Rp108 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Charoen Pokphand Indonesia Tbk (CPIN) sebesar Rp108 per lembar saham."
  },
  {
    "id": "div_INTP_20250603",
    "ticker": "INTP",
    "date": "2025-06-03",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai INTP",
    "sub": "Dividen Rp259 per lembar saham",
    "amount": "Rp259 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Indocement Tunggal Prakarsa Tbk (INTP) sebesar Rp259 per lembar saham."
  },
  {
    "id": "div_INCO_20250527",
    "ticker": "INCO",
    "date": "2025-05-27",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai INCO",
    "sub": "Dividen Rp53.40 per lembar saham",
    "amount": "Rp53.40 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Vale Indonesia Tbk (INCO) sebesar Rp53.40 per lembar saham."
  },
  {
    "id": "div_JSMR_20250520",
    "ticker": "JSMR",
    "date": "2025-05-20",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai JSMR",
    "sub": "Dividen Rp156.23 per lembar saham",
    "amount": "Rp156.23 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Jasa Marga (Persero) Tbk (JSMR) sebesar Rp156.23 per lembar saham."
  },
  {
    "id": "div_HEAL_20250505",
    "ticker": "HEAL",
    "date": "2025-05-05",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai HEAL",
    "sub": "Dividen Rp10.50 per lembar saham",
    "amount": "Rp10.50 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Medikaloka Hermina Tbk (HEAL) sebesar Rp10.50 per lembar saham."
  },
  {
    "id": "div_CUAN_20250430",
    "ticker": "CUAN",
    "date": "2025-04-30",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai CUAN",
    "sub": "Dividen Rp0.32 per lembar saham",
    "amount": "Rp0.32 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Petrindo Jaya Kreasi Tbk (CUAN) sebesar Rp0.32 per lembar saham."
  },
  {
    "id": "div_SSMS_20250430",
    "ticker": "SSMS",
    "date": "2025-04-30",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai SSMS",
    "sub": "Dividen Rp47.24 per lembar saham",
    "amount": "Rp47.24 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Sawit Sumbermas Sarana Tbk (SSMS) sebesar Rp47.24 per lembar saham."
  },
  {
    "id": "div_ESSA_20250428",
    "ticker": "ESSA",
    "date": "2025-04-28",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ESSA",
    "sub": "Dividen Rp10 per lembar saham",
    "amount": "Rp10 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT ESSA Industries Indonesia Tbk (ESSA) sebesar Rp10 per lembar saham."
  },
  {
    "id": "div_JPFA_20250422",
    "ticker": "JPFA",
    "date": "2025-04-22",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai JPFA",
    "sub": "Dividen Rp70 per lembar saham",
    "amount": "Rp70 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Japfa Comfeed Indonesia Tbk (JPFA) sebesar Rp70 per lembar saham."
  },
  {
    "id": "div_BBTN_20250415",
    "ticker": "BBTN",
    "date": "2025-04-15",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BBTN",
    "sub": "Dividen Rp53.57 per lembar saham",
    "amount": "Rp53.57 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bank Tabungan Negara (Persero) Tbk (BBTN) sebesar Rp53.57 per lembar saham."
  },
  {
    "id": "div_BBNI_20250415",
    "ticker": "BBNI",
    "date": "2025-04-15",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BBNI",
    "sub": "Dividen Rp374.06 per lembar saham",
    "amount": "Rp374.06 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bank Negara Indonesia (Persero) Tbk (BBNI) sebesar Rp374.06 per lembar saham."
  },
  {
    "id": "div_BRPT_20240627",
    "ticker": "BRPT",
    "date": "2024-06-27",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BRPT",
    "sub": "Dividen Rp0.87 per lembar saham",
    "amount": "Rp0.87 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Barito Pacific Tbk (BRPT) sebesar Rp0.87 per lembar saham."
  },
  {
    "id": "div_BBTN_20240319",
    "ticker": "BBTN",
    "date": "2024-03-19",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BBTN",
    "sub": "Dividen Rp49.89 per lembar saham",
    "amount": "Rp49.89 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bank Tabungan Negara (Persero) Tbk (BBTN) sebesar Rp49.89 per lembar saham."
  },
  {
    "id": "div_HRUM_20221214",
    "ticker": "HRUM",
    "date": "2022-12-14",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai HRUM",
    "sub": "Dividen Rp75.10 per lembar saham",
    "amount": "Rp75.10 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Harum Energy Tbk (HRUM) sebesar Rp75.10 per lembar saham."
  },
  {
    "id": "div_PNLF_20220711",
    "ticker": "PNLF",
    "date": "2022-07-11",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai PNLF",
    "sub": "Dividen Rp10 per lembar saham",
    "amount": "Rp10 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Panin Financial Tbk (PNLF) sebesar Rp10 per lembar saham."
  },
  {
    "id": "div_HRUM_20220615",
    "ticker": "HRUM",
    "date": "2022-06-15",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai HRUM",
    "sub": "Dividen Rp15.02 per lembar saham",
    "amount": "Rp15.02 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Harum Energy Tbk (HRUM) sebesar Rp15.02 per lembar saham."
  },
  {
    "id": "div_BSDE_20170612",
    "ticker": "BSDE",
    "date": "2017-06-12",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BSDE",
    "sub": "Dividen Rp5 per lembar saham",
    "amount": "Rp5 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bumi Serpong Damai Tbk (BSDE) sebesar Rp5 per lembar saham."
  },
  {
    "id": "div_BSDE_20160527",
    "ticker": "BSDE",
    "date": "2016-05-27",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai BSDE",
    "sub": "Dividen Rp5 per lembar saham",
    "amount": "Rp5 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Bumi Serpong Damai Tbk (BSDE) sebesar Rp5 per lembar saham."
  },
  {
    "id": "div_KPIG_20160516",
    "ticker": "KPIG",
    "date": "2016-05-16",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai KPIG",
    "sub": "Dividen Rp0.60 per lembar saham",
    "amount": "Rp0.60 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT MNC Land Tbk (KPIG) sebesar Rp0.60 per lembar saham."
  },
  {
    "id": "div_KPIG_20150529",
    "ticker": "KPIG",
    "date": "2015-05-29",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai KPIG",
    "sub": "Dividen Rp1 per lembar saham",
    "amount": "Rp1 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT MNC Land Tbk (KPIG) sebesar Rp1 per lembar saham."
  },
  {
    "id": "div_PNLF_20050719",
    "ticker": "PNLF",
    "date": "2005-07-19",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai PNLF",
    "sub": "Dividen Rp4 per lembar saham",
    "amount": "Rp4 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Panin Financial Tbk (PNLF) sebesar Rp4 per lembar saham."
  },
  {
    "id": "div_ENRG_20041202",
    "ticker": "ENRG",
    "date": "2004-12-02",
    "type": "Dividen",
    "title": "Cum/Ex Date Dividen Tunai ENRG",
    "sub": "Dividen Rp2.66 per lembar saham",
    "amount": "Rp2.66 per saham",
    "note": "Distribusi dividen tunai riil untuk pemegang saham PT Energi Mega Persada Tbk (ENRG) sebesar Rp2.66 per lembar saham."
  }
];
