// Factual award records verified against the linked official archives on 2026-10-21.
export type AwardFamily = 'strega' | 'booker' | 'international' | 'europe' | 'nobel';
export type AwardWinner = { id: string; year: number; title: string | null; author: string; source: string; cover?: string | null };
export const AWARDS_VERIFIED_AT = '2026-10-21';
export const AWARD_DATA: Record<AwardFamily, AwardWinner[]> = {
  "strega": [
    {
      "year": 2026,
      "title": "I convitati di pietra",
      "author": "Michele Mari",
      "source": "https://premiostrega.it/PS/libro/i-convitati-di-pietra/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/ok-MARI-MICHELE_I-convitati-di-pietra-rmv0dyebvwfueqrpkkhwdi59ba6i2iuygnm013u6ja.webp",
      "id": "strega-2026-f10b83d2"
    },
    {
      "year": 2025,
      "title": "L’anniversario",
      "author": "Andrea Bajani",
      "source": "https://premiostrega.it/PS/libro/lanniversario/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/Bajani25cover-r1op54xd1619px65hsrnnyrw57l5zkrt0ev31t9eom.webp",
      "id": "strega-2025-77321ebc"
    },
    {
      "year": 2024,
      "title": "L’età fragile",
      "author": "Donatella Di Pietrantonio",
      "source": "https://premiostrega.it/PS/libro/leta-fragile/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/PS24_DiPietrantonio_Cover-qlzbh8pen7b5sb4p4emikb2ec9tzk5xue9687a595i.webp",
      "id": "strega-2024-bd793a29"
    },
    {
      "year": 2023,
      "title": "Come d’aria",
      "author": "Ada D’Adamo",
      "source": "https://premiostrega.it/PS/libro/come-daria/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/dadamo-cover-q46f84rszj0b67l18097t3qzjaz75c40cgm1xwouc6.jpg",
      "id": "strega-2023-7973287a"
    },
    {
      "year": 2022,
      "title": "Spatriati",
      "author": "Mario Desiati",
      "source": "https://premiostrega.it/PS/libro/spatriati/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/PS22_Desiati_Cover-punpkkwmjdjiieayotqt9pkw9z5pgocwal70wgjy52.png",
      "id": "strega-2022-c2fb131a"
    },
    {
      "year": 2021,
      "title": "Due vite",
      "author": "Emanuele Trevi",
      "source": "https://premiostrega.it/PS/libro/due-vite/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/PS21_Trevi_Cover_Web-p4cobk1qimay6uuzo009rzak75pe0s1tpcf1pn1pqu.jpg",
      "id": "strega-2021-a794bc3f"
    },
    {
      "year": 2020,
      "title": "Il Colibrì",
      "author": "Sandro Veronesi",
      "source": "https://premiostrega.it/PS/libro/il-colibri/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/Veronesi_cover-okvfymfw1btbeh41gixggpyf0m44m17x25m1f5bija.jpg",
      "id": "strega-2020-152fa99c"
    },
    {
      "year": 2019,
      "title": "M. Il figlio del secolo",
      "author": "Antonio Scurati",
      "source": "https://premiostrega.it/PS/libro/m-il-figlio-del-secolo/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/PS19_Scurati_Cover_Small-o4t8smi8ufmu5hzes3fq22n9935qmujsjtlgku3mom.jpg",
      "id": "strega-2019-0f9c1b49"
    },
    {
      "year": 2018,
      "title": "La ragazza con la Leica",
      "author": "Helena Janeczek",
      "source": "https://premiostrega.it/PS/libro/la-ragazza-con-la-leica/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/ragazza-1-nox095ss70hw7zmski2kmntzyh3n33on0a4p6uo7ti.jpg",
      "id": "strega-2018-3b45998d"
    },
    {
      "year": 2017,
      "title": "Le otto montagne",
      "author": "Paolo Cognetti",
      "source": "https://premiostrega.it/PS/libro/le-otto-montagne/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/otto_montagne-n79gupkpmo66s7hkf3schi3zgirjynq8tgh2kn9mza.jpg",
      "id": "strega-2017-94f653d2"
    },
    {
      "year": 2016,
      "title": "La scuola cattolica",
      "author": "Edoardo Albinati",
      "source": "https://premiostrega.it/PS/libro/la-scuola-cattolica/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS16_Albinati_600px-mzytzv8m3io7f6xrfpg2deq3811gde73yeiykeftzq.jpg",
      "id": "strega-2016-7b9f9121"
    },
    {
      "year": 2015,
      "title": "La ferocia",
      "author": "Nicola Lagioia",
      "source": "https://premiostrega.it/PS/libro/la-ferocia/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_Strega15_Lagioia_600px-mzytw3vurdiwzcede2xsecvpojklkz9rfsl1gk0ivq.jpg",
      "id": "strega-2015-83d3f921"
    },
    {
      "year": 2014,
      "title": "Il desiderio di essere come tutti",
      "author": "Francesco Piccolo",
      "source": "https://premiostrega.it/PS/libro/il-desiderio-di-essere-come-tutti/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_Strega14_Piccolo-pup8qycb6eqjgqziny3ayyf8sikstz4ee81fw5c712.jpg",
      "id": "strega-2014-c69114fa"
    },
    {
      "year": 2013,
      "title": "Resistere non serve a niente",
      "author": "Walter Siti",
      "source": "https://premiostrega.it/PS/libro/resistere-non-serve-a-niente/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_Strega13_Siti_600px-mzytujhjdbdpmqoajek68r421fakr51v81fwnyc592.jpg",
      "id": "strega-2013-17d23bf4"
    },
    {
      "year": 2012,
      "title": "Inseparabili. Il fuoco amico dei ricordi",
      "author": "Alessandro Piperno",
      "source": "https://premiostrega.it/PS/libro/inseparabili-il-fuoco-amico-dei-ricordi/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_Strega11_Piperno_600px-mzyttg0be9vo349mxxhuc12p38p5rup52m1iibyoie.jpg",
      "id": "strega-2012-606d4358"
    },
    {
      "year": 2011,
      "title": "Storia della mia gente",
      "author": "Edoardo Nesi",
      "source": "https://premiostrega.it/PS/libro/storia-della-mia-gente/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_Strega11_Nesi_600px-mzytt2ukqldnkksr2rt2d4e8rui0s38wcswpsgi6xi.jpg",
      "id": "strega-2011-48da2ee2"
    },
    {
      "year": 2010,
      "title": "Canale Mussolini",
      "author": "Antonio Pennacchi",
      "source": "https://premiostrega.it/PS/libro/canale-mussolini/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_Strega10_Pennacchi_600px-mzytr0lbqok03dsm4dpje54tueo0w023qldcvlkal2.jpg",
      "id": "strega-2010-91f980e2"
    },
    {
      "year": 2009,
      "title": "Stabat Mater",
      "author": "Tiziano Scarpa",
      "source": "https://premiostrega.it/PS/libro/stabat-mater/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_Strega09_Scarpa-pup80cirq8bcu3mt0y2gw64jgvpryehx2j9nv6sd5i.jpg",
      "id": "strega-2009-636bc235"
    },
    {
      "year": 2008,
      "title": "La Solitudine dei numeri primi",
      "author": "Paolo Giordano",
      "source": "https://premiostrega.it/PS/libro/la-solitudine-dei-numeri-primi/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_Strega08_Giordano_600px-mzyti5y1dufsrkngt1z0evjkgsalelx3is7r6sor6e.jpg",
      "id": "strega-2008-660828ef"
    },
    {
      "year": 2007,
      "title": "Come Dio Comanda",
      "author": "Niccolò Ammaniti",
      "source": "https://premiostrega.it/PS/libro/come-dio-comanda/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_2007_600px-mzytfx3x23d513wvx313gfxxdnd10n06jo3zx00m1i.jpg",
      "id": "strega-2007-02d32420"
    },
    {
      "year": 2006,
      "title": "Caos calmo",
      "author": "Sandro Veronesi",
      "source": "https://premiostrega.it/PS/libro/caos-calmo/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_2006_600px-mzytfv88ofakdvzm827ubgf06vmal8spvet0yg3edy.jpg",
      "id": "strega-2006-152fa99c"
    },
    {
      "year": 2005,
      "title": "Il viaggiatore notturno",
      "author": "Maurizio Maggiani",
      "source": "https://premiostrega.it/PS/libro/il-viaggiatore-notturno/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_2005_600px-mzytfrgvx35f3g52u0lc1hd5tc4tqgdsiw731c8z2u.jpg",
      "id": "strega-2005-94c2f3a2"
    },
    {
      "year": 2004,
      "title": "Il dolore perfetto",
      "author": "Ugo Riccarelli",
      "source": "https://premiostrega.it/PS/libro/il-dolore-perfetto/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_2004_600px-mzytfnpj5r09t0ajfyytribbfsncvnyv6dl548ejrq.jpg",
      "id": "strega-2004-15ba57e0"
    },
    {
      "year": 2003,
      "title": "Vita",
      "author": "Melania Gaia Mazzucco",
      "source": "https://premiostrega.it/PS/libro/vita/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_2003_600px-mzytfkw0l8weu6emwfqy210xnn198kno5zmooeiqae.jpg",
      "id": "strega-2003-85a4f026"
    },
    {
      "year": 2002,
      "title": "Non ti muovere",
      "author": "Margaret Mazzantini",
      "source": "https://premiostrega.it/PS/libro/non-ti-muovere/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_2002_600px-mzytfi2i0qsjvciqcwj2cjqjvhf5lhch5lo88kmwt2.jpg",
      "id": "strega-2002-9386df91"
    },
    {
      "year": 2001,
      "title": "Via Gemito",
      "author": "Domenico Starnone",
      "source": "https://premiostrega.it/PS/libro/via-gemito/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_2001_600px-mzytff8zg8oowimttdb6n2g63bt1ye1a57prsqr3bq.jpg",
      "id": "strega-2001-0cfb4d85"
    },
    {
      "year": 2000,
      "title": "N.",
      "author": "Ernesto Ferrero",
      "source": "https://premiostrega.it/PS/libro/n/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_2000_Quadro-mzytfddb2km49apk4chxi2x8wk2bizttgyesu6tvo6.jpg",
      "id": "strega-2000-c721a036"
    },
    {
      "year": 1999,
      "title": "Buio",
      "author": "Dacia Maraini",
      "source": "https://premiostrega.it/PS/libro/buio/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1999_600px-mzytf9lyb8gyyuv0qavf83vej0kuo7ew4fsux2zgd2.jpg",
      "id": "strega-1999-65904e10"
    },
    {
      "year": 1998,
      "title": "I bei momenti",
      "author": "Enzo Siciliano",
      "source": "https://premiostrega.it/PS/libro/i-bei-momenti/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1998_600px-mzytf7q9xkeebmxr1a2634chc8u48t7fg6hvyj28pi.jpg",
      "id": "strega-1998-c12d1f33"
    },
    {
      "year": 1997,
      "title": "Microcosmi",
      "author": "Claudio Magris",
      "source": "https://premiostrega.it/PS/libro/microcosmi/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1997_600px-mzytf312ze7ypl4ksq118nj6dbha6borrj8gk597km.jpg",
      "id": "strega-1997-a353c45e"
    },
    {
      "year": 1996,
      "title": "Bella vita e guerre altrui di Mr. Pyle, gentiluomo",
      "author": "Alessandro Barbero",
      "source": "https://premiostrega.it/PS/libro/bella-vita-e-guerre-altrui-di-mr-pyle-gentiluomo/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1996_600px-mzytf07kew43qr8o96t5j68sl5v6j8dkr5a04bde3a.jpg",
      "id": "strega-1996-446dc96a"
    },
    {
      "year": 1995,
      "title": "Passaggio in ombra",
      "author": "Mariateresa Di Lascia",
      "source": "https://premiostrega.it/PS/libro/passaggio-in-ombra/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1995_600px-mzytewg7njyygbe4v56n976y7mdpofynemo277iys6.jpg",
      "id": "strega-1995-595c9b25"
    },
    {
      "year": 1994,
      "title": "La casa del padre",
      "author": "Giorgio Montefoschi",
      "source": "https://premiostrega.it/PS/libro/la-casa-del-padre/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1994_600px-mzytetmp31v3hhi8blyrjpwkfgrm1cnge8plrdn5au.jpg",
      "id": "strega-1994-a547ef59"
    },
    {
      "year": 1993,
      "title": "Ninfa plebea",
      "author": "Domenico Rea",
      "source": "https://premiostrega.it/PS/libro/ninfa-plebea/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1993_600px-mzyteqt6ijr8inmbs2qvu8m6nb5ie9c9dur5bjrbti.jpg",
      "id": "strega-1993-fb08bcce"
    },
    {
      "year": 1992,
      "title": "Nottetempo, casa per casa",
      "author": "Vincenzo Consolo",
      "source": "https://premiostrega.it/PS/libro/nottetempo-casa-per-casa/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1992_600px-mzyten1tr7m387rse14dk9kc9ro1jgxc1c57efwwie.jpg",
      "id": "strega-1992-8b39667c"
    },
    {
      "year": 1991,
      "title": "La strada per Roma",
      "author": "Paolo Volponi",
      "source": "https://premiostrega.it/PS/libro/la-strada-per-roma/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1991_600px-mzytek8b6pi89dvvuhwhus9yhm1xwdm50y6qym1312.jpg",
      "id": "strega-1991-01386022"
    },
    {
      "year": 1990,
      "title": "La chimera",
      "author": "Sebastiano Vassalli",
      "source": "https://premiostrega.it/PS/libro/la-chimera/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1990_600px-mzytednfuv98045fwx23vbxqbwydehw0o1mcloau8m.jpg",
      "id": "strega-1990-fee46611"
    },
    {
      "year": 1989,
      "title": "La grande sera",
      "author": "Giuseppe Pontiggia",
      "source": "https://premiostrega.it/PS/libro/la-grande-sera/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1989_600px-mzyteatxad5d1a9jddu85uncjrc9rektnnnw5uf0ra.jpg",
      "id": "strega-1989-b153f462"
    },
    {
      "year": 1988,
      "title": "Le menzogne della notte",
      "author": "Gesualdo Bufalino",
      "source": "https://premiostrega.it/PS/libro/le-menzogne-della-notte/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1988_600px-mzyte72kj107quezzc7pvvli67uswm5wb51y8qklg6.jpg",
      "id": "strega-1988-1e80ebe0"
    },
    {
      "year": 1987,
      "title": "Le isole del paradiso",
      "author": "Stanislao Nievo",
      "source": "https://premiostrega.it/PS/libro/le-isole-del-paradiso/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1987_600px-mzyte491yiwcs0j3fszu6eb4e28p9iupar3hsworyu.jpg",
      "id": "strega-1987-5b8b272d"
    },
    {
      "year": 1986,
      "title": "Rinascimento privato",
      "author": "Maria Bellonci",
      "source": "https://premiostrega.it/PS/libro/rinascimento-privato/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1986_600px-mzyte1fje0sht6n6w9rygx0qlwmlmfjiad51d2syhi.jpg",
      "id": "strega-1986-12667973"
    },
    {
      "year": 1985,
      "title": "L’armata dei fiumi perduti",
      "author": "Carlo Sgorlon",
      "source": "https://premiostrega.it/PS/libro/larmata-dei-fiumi-perduti/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1985_600px-mzytdym0tiomucracqk2rfqctr0hzc8b9z6kx8x506.jpg",
      "id": "strega-1985-b4137f27"
    },
    {
      "year": 1984,
      "title": "Tolstoj",
      "author": "Pietro Citati",
      "source": "https://premiostrega.it/PS/libro/tolstoj/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1984_600px-mzytdvsi90krvivdt7c71yfz1leec8x49l84hf1biu.jpg",
      "id": "strega-1984-c8e4a82e"
    },
    {
      "year": 1983,
      "title": "Il Natale del 1833",
      "author": "Mario Pomilio",
      "source": "https://premiostrega.it/PS/libro/il-natale-del-1833/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1983_600px-mzytdsyzoigwwozh9o4bch5l9fsap5lx979o1l5i1i.jpg",
      "id": "strega-1983-c06b3ae6"
    },
    {
      "year": 1982,
      "title": "Sillabario n.2",
      "author": "Goffredo Parise",
      "source": "https://premiostrega.it/PS/libro/sillabario-n-2/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1982_600px-mzytdq5h40d1xv3kq4wfmzv7ha6722aq8tb7lr9ok6.jpg",
      "id": "strega-1982-9ba18d49"
    },
    {
      "year": 1981,
      "title": "Il nome della rosa",
      "author": "Umberto Eco",
      "source": "https://premiostrega.it/PS/libro/il-nome-della-rosa/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1981_600px-mzytdme4co7wnf91c39xd0td3qoq79vswap9onf992.jpg",
      "id": "strega-1981-651c3c5b"
    },
    {
      "year": 1980,
      "title": "La vita ingenua",
      "author": "Vittorio Gorresio",
      "source": "https://premiostrega.it/PS/libro/la-vita-ingenua/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1980_600px-mzytdjkls641old4sk21njizbl2mk6klvwqt8tjfrq.jpg",
      "id": "strega-1980-112b89a3"
    },
    {
      "year": 1979,
      "title": "La chiave a stella",
      "author": "Primo Levi",
      "source": "https://premiostrega.it/PS/libro/la-chiave-a-stella/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1979_600px-mzytdgr37o06prh890u5y28ljfgix39eviscsznmae.jpg",
      "id": "strega-1979-3a4576bd"
    },
    {
      "year": 1978,
      "title": "Un altare per la madre",
      "author": "Ferdinando Camon",
      "source": "https://premiostrega.it/PS/libro/un-altare-per-la-madre/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1978_600px-mzytddxkn5wbqxlbphma8ky7r9uf9zy7v4twd5rst2.jpg",
      "id": "strega-1978-ac9ddf2f"
    },
    {
      "year": 1977,
      "title": "La miglior vita",
      "author": "Fulvio Tomizza",
      "source": "https://premiostrega.it/PS/libro/la-miglior-vita/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1977_600px-mzytdb422nsgs3pf5yeej3ntz48bmwn0uqvfxbvzbq.jpg",
      "id": "strega-1977-ba946c72"
    },
    {
      "year": 1976,
      "title": "Le quattro ragazze Wieselberger",
      "author": "Fausta Cialente",
      "source": "https://premiostrega.it/PS/libro/le-quattro-ragazze-wieselberger/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1976_600px-mzytd8aji5olt9timf6itmdg6ym7ztbtucwzhi05ue.jpg",
      "id": "strega-1976-df26ba47"
    },
    {
      "year": 1975,
      "title": "A caso",
      "author": "Tommaso Landolfi",
      "source": "https://premiostrega.it/PS/libro/a-caso/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1975_600px-mzytd4j6qtjgityz8dk0jnbltf4r50wwhub1ke5qja.jpg",
      "id": "strega-1975-89591694"
    },
    {
      "year": 1974,
      "title": "La morte del fiume",
      "author": "Guglielmo Petroni",
      "source": "https://premiostrega.it/PS/libro/la-morte-del-fiume/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1974_600px-mzytd1po6bflk032ouc4u61819inhxlphgcl4k9x1y.jpg",
      "id": "strega-1974-f6999aff"
    },
    {
      "year": 1973,
      "title": "Allegri, gioventù",
      "author": "Manlio Cancogni",
      "source": "https://premiostrega.it/PS/libro/allegri-gioventu/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1973_600px-mzytcx0h8595xy9wgaazzp7x2c5tfg31st35q6gvx2.jpg",
      "id": "strega-1973-0858d079"
    },
    {
      "year": 1972,
      "title": "Paese d’ombre",
      "author": "Giuseppe Dessì",
      "source": "https://premiostrega.it/PS/libro/paese-dombre/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1972_600px-mzytcu6ynn5az4dzwr34a7xja6jpscrusf4pacl2fq.jpg",
      "id": "strega-1972-e65a07b7"
    },
    {
      "year": 1971,
      "title": "La spiaggia d’oro",
      "author": "Raffaello Brignetti",
      "source": "https://premiostrega.it/PS/libro/la-spiaggia-doro/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1971_600px-mzytcrdg351g0ai3d7v8kqn5i0xm59gns168uip8ye.jpg",
      "id": "strega-1971-6f9d1a8f"
    },
    {
      "year": 1970,
      "title": "Le stelle fredde",
      "author": "Guido Piovene",
      "source": "https://premiostrega.it/PS/libro/le-stelle-fredde/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1970_600px-mzytcojximxl1gm6toncv9crpvbii65grn7seotfh2.jpg",
      "id": "strega-1970-d94708fd"
    },
    {
      "year": 1969,
      "title": "Le parole tra noi leggere",
      "author": "Lalla Romano",
      "source": "https://premiostrega.it/PS/libro/le-parole-tra-noi-leggere/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1969_600px-mzytclqey4tq2mqaa5fh5s2dxppev2u9r99byuxlzq.jpg",
      "id": "strega-1969-7a6b7d6c"
    },
    {
      "year": 1968,
      "title": "L’occhio del gatto",
      "author": "Alberto Bevilacqua",
      "source": "https://premiostrega.it/PS/libro/locchio-del-gatto/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1968_600px-mzytciwwdmpv3sudqm7lgas05k3b7zj2qvavj11sie.jpg",
      "id": "strega-1968-811502ce"
    },
    {
      "year": 1967,
      "title": "Poveri e semplici",
      "author": "Anna Maria Ortese",
      "source": "https://premiostrega.it/PS/libro/poveri-e-semplici/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1967_600px-mzytcg3dt4m04yyh72zpqthmdeh7kw7vqhcf375z12.jpg",
      "id": "strega-1967-65ab1b92"
    },
    {
      "year": 1966,
      "title": "Una spirale di nebbia",
      "author": "Michele Prisco",
      "source": "https://premiostrega.it/PS/libro/una-spirale-di-nebbia/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1966_600px-mzytce7pfgjfhr17i26gltyp6mqh5i0f281g4n8rdi.jpg",
      "id": "strega-1966-609de07c"
    },
    {
      "year": 1965,
      "title": "La macchina mondiale",
      "author": "Paolo Volponi",
      "source": "https://premiostrega.it/PS/libro/la-macchina-mondiale/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1965_600px-mzytcagco4ea7b6o40jybuwut390aplhppfi7jec2e.jpg",
      "id": "strega-1965-01386022"
    },
    {
      "year": 1964,
      "title": "L’ombra delle colline",
      "author": "Giovanni Arpino",
      "source": "https://premiostrega.it/PS/libro/lombra-delle-colline/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1964_600px1-mzytc6ozws94wvc4pyxg1vv0fjrjfx6kd6tkafjwra.jpg",
      "id": "strega-1964-55b262cb"
    },
    {
      "year": 1963,
      "title": "Lessico famigliare",
      "author": "Natalia Ginzburg",
      "source": "https://premiostrega.it/PS/libro/lessico-famigliare/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1963_600px1-mzytc3vhca59y1g86fpkcekmne5fstvdcsv3ulo39y.jpg",
      "id": "strega-1963-a5d3d5f9"
    },
    {
      "year": 1962,
      "title": "Il clandestino",
      "author": "Mario Tobino",
      "source": "https://premiostrega.it/PS/libro/il-clandestino/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1962_600px1-mzytbz6ae3yubzn1xvofhxrbogslqccpo5log7v252.jpg",
      "id": "strega-1962-803c0866"
    },
    {
      "year": 1961,
      "title": "Ferito a morte",
      "author": "Raffaele La Capria",
      "source": "https://premiostrega.it/PS/libro/ferito-a-morte/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1961_600px-mzytbvexmrtp1jsiju1x7yphaxb4vjxsbmzqj40mty.jpg",
      "id": "strega-1961-d0edde63"
    },
    {
      "year": 1960,
      "title": "La ragazza di Bube",
      "author": "Carlo Cassola",
      "source": "https://premiostrega.it/PS/libro/la-ragazza-di-bube/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1960_600px1-mzytbslf29pu2pwm0au1ihf3irp18gmlb91a3a4tcm.jpg",
      "id": "strega-1960-39a12f3f"
    },
    {
      "year": 1959,
      "title": "Il gattopardo",
      "author": "Giuseppe Tomasi di Lampedusa",
      "source": "https://premiostrega.it/PS/libro/il-gattopardo/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1959_600px1-mzytbl2pjlfjhu7j87l0yjberoq3ivsqm7te92fyqe.jpg",
      "id": "strega-1959-f6be9f3c"
    },
    {
      "year": 1958,
      "title": "Sessanta racconti",
      "author": "Dino Buzzati",
      "source": "https://premiostrega.it/PS/libro/sessanta-racconti/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1958_600px1-mzytb6z4p2w8nos0ijhmf4vhuwnlbf8rka141x0vbq.jpg",
      "id": "strega-1958-c3a4fbf0"
    },
    {
      "year": 1957,
      "title": "L’isola di Arturo",
      "author": "Elsa Morante",
      "source": "https://premiostrega.it/PS/libro/lisola-di-arturo/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1957_600px1-mzytb1c3k2oiq107fh1v06aqalfe18mdji476998d2.jpg",
      "id": "strega-1957-3529b9a2"
    },
    {
      "year": 1956,
      "title": "Cinque storie ferraresi",
      "author": "Giorgio Bassani",
      "source": "https://premiostrega.it/PS/libro/cinque-storie-ferraresi/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1956_600px1-mzytaxkqsqjdfl5o1ffcq78vx1xx6g7g6zi995et1y.jpg",
      "id": "strega-1956-6a14e86a"
    },
    {
      "year": 1955,
      "title": "Un gatto attraversa la strada",
      "author": "Giovanni Comisso",
      "source": "https://premiostrega.it/PS/libro/un-gatto-attraversa-la-strada/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1955_600px-mzytaur888figr9rhw7h0pyi4wbtjcw96ljstbizkm.jpg",
      "id": "strega-1955-8420a5e6"
    },
    {
      "year": 1954,
      "title": "Le lettere da Capri",
      "author": "Mario Soldati",
      "source": "https://premiostrega.it/PS/libro/le-lettere-da-capri/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1954_600px-mzytarxpnqbnhxduyczlb8o4cqppw9l267lcdhn63a.jpg",
      "id": "strega-1954-fcc2259a"
    },
    {
      "year": 1953,
      "title": "L’amante fedele",
      "author": "Massimo Bontempelli",
      "source": "https://premiostrega.it/PS/libro/lamante-fedele/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1953_600px1-mzytao6cwe6i7hjbkbd319m9z7891h64tozegdsqs6.jpg",
      "id": "strega-1953-c2e9447e"
    },
    {
      "year": 1952,
      "title": "I racconti",
      "author": "Alberto Moravia",
      "source": "https://premiostrega.it/PS/libro/i-racconti/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1952_600px1-mzytalcubw2n8nnf0s57bsbw71m5eduxtb0y0jwxau.jpg",
      "id": "strega-1952-258b2501"
    },
    {
      "year": 1951,
      "title": "Quasi una vita",
      "author": "Corrado Alvaro",
      "source": "https://premiostrega.it/PS/libro/quasi-una-vita/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1951_600px1-mzytaijbrdys9trih8xbmb1iew01rajqsx2hkq13ti.jpg",
      "id": "strega-1951-a9a446d2"
    },
    {
      "year": 1950,
      "title": "La bella estate",
      "author": "Cesare Pavese",
      "source": "https://premiostrega.it/PS/libro/la-bella-estate/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1950_600px1-mzytadu4t7scnryc8ow6ru87fyn7ot1349t26c82om.jpg",
      "id": "strega-1950-c1859c62"
    },
    {
      "year": 1949,
      "title": "La memoria",
      "author": "Giovanni Battista Angioletti",
      "source": "https://premiostrega.it/PS/libro/la-memoria/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1949_600px1-mzyta873o7kmq46j5mgfcvnfvnf0emep3hw5aogfpy.jpg",
      "id": "strega-1949-487ec373"
    },
    {
      "year": 1948,
      "title": "Villa Tarantola",
      "author": "Vincenzo Cardarelli",
      "source": "https://premiostrega.it/PS/libro/villa-tarantola/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1948_600px-mzysydgdhfcgb5eedhzswvc66pudc1ck4tppf2166u.jpg",
      "id": "strega-1948-737fb186"
    },
    {
      "year": 1947,
      "title": "Tempo di uccidere",
      "author": "Ennio Flaiano",
      "source": "https://premiostrega.it/PS/libro/tempo-di-uccidere/",
      "cover": "https://premiostrega.it/PS/wp-content/uploads/elementor/thumbs/FB_PS_1947_600px-mzysyamuwx8lcbihtyrx7e1sek89oy1d4fr8z85cpi.jpg",
      "id": "strega-1947-0c716536"
    }
  ],
  "europe": [
    {
      "year": 2026,
      "title": "La chiamata. Storia di una donna argentina",
      "author": "Leila Guerriero",
      "source": "https://premiostrega.it/PSE/libro/la-chiamata-storia-di-una-donna-argentina/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/La-chiamata-rl2miza5rlapcgchxvtvc1qjktzh9c14s9tz61kihi.webp",
      "id": "europe-2026-c90a940b"
    },
    {
      "year": 2025,
      "title": "Il giorno dell’ape",
      "author": "Paul Murray",
      "source": "https://premiostrega.it/PSE/libro/il-giorno-dellape/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/Il-giorno-dellape_Cover-r45xgbbaa8trvr04k75mct9le933la654zxcy3yweu.webp",
      "id": "europe-2025-85bac023"
    },
    {
      "year": 2024,
      "title": "Triste Tigre",
      "author": "Neige Sinno",
      "source": "https://premiostrega.it/PSE/libro/triste-tigre/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/Neige-Sinno_Cover-qllk7pskoe180rie0zum50xpzbakxyykqaq0h05sie.webp",
      "id": "europe-2024-a4e78249"
    },
    {
      "year": 2023,
      "title": "V13",
      "author": "Emmanuel Carrère",
      "source": "https://premiostrega.it/PSE/libro/v13/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/Carrere_V13-q46bz5quhqvqd5hs9g0limdy93it9bqixhyrya4knq.jpg",
      "id": "europe-2023-e043421a"
    },
    {
      "year": 2022,
      "title": "Primo sangue",
      "author": "Amélie Nothomb",
      "source": "https://premiostrega.it/PSE/libro/primo-sangue/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/PSE22_Copertine_Nothomb_Full-pnp2uq2jnsdtccd3u0qurv5d8v11pmzebgt1u58786.jpg",
      "id": "europe-2022-c7e5baaa"
    },
    {
      "year": 2022,
      "title": "Punto di fuga",
      "author": "Mikhail Shishkin",
      "source": "https://premiostrega.it/PSE/libro/punto-di-fuga/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/PSE22_Copertine_Shishkin_Full-pnp2ury81ggdzkadj1k3wuoafmrs516uzq40sp5evq.jpg",
      "id": "europe-2022-06ac0972"
    },
    {
      "year": 2021,
      "title": "Cronorifugio",
      "author": "Georgi Gospodinov",
      "source": "https://premiostrega.it/PSE/libro/cronorifugio/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/gospodinov-pnqx5d42l1ii8vmwj5q393s0c9l0uws1g8kztoj6hi.jpg",
      "id": "europe-2021-dde3a304"
    },
    {
      "year": 2020,
      "title": "Inventario di alcune cose perdute",
      "author": "Judith Schalansky",
      "source": "https://premiostrega.it/PSE/libro/inventario-di-alcune-cose-perdute/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/shalansky-pnqx5c68e7h7x9o9onbgom0jqvpnn7ob43xicekknq.jpg",
      "id": "europe-2020-33829da6"
    },
    {
      "year": 2019,
      "title": "Fratelli d’anima",
      "author": "David Diop",
      "source": "https://premiostrega.it/PSE/libro/fratelli-danima/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/diop-pnqx5ezqypl2w3k686jce3axj1braazi4hvys8ge52.jpg",
      "id": "europe-2019-f86b0c10"
    },
    {
      "year": 2018,
      "title": "Patria",
      "author": "Fernando Aramburu",
      "source": "https://premiostrega.it/PSE/libro/patria/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/aramburu-pnqx5b8e7dfxlnpmu4wu44935huafikkrza0v4lyty.jpg",
      "id": "europe-2018-eca6086d"
    },
    {
      "year": 2017,
      "title": "Voci del verbo andare",
      "author": "Jenny Erpenbeck",
      "source": "https://premiostrega.it/PSE/libro/voci-del-verbo-andare/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/erpenbeck-pnqx5e1wrvjskhljdo4ptljgxnge2lvrsd8hayhsba.jpg",
      "id": "europe-2017-abd8b36a"
    },
    {
      "year": 2016,
      "title": "Gli anni",
      "author": "Annie Ernaux",
      "source": "https://premiostrega.it/PSE/libro/gli-anni/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/ernaux-pnqx5fxl5jmd7pit2oxyyl2e4f74i038gmjg9iezyu.jpg",
      "id": "europe-2016-e2314e02"
    },
    {
      "year": 2015,
      "title": "Forse Esther",
      "author": "Katja Petrowskaja",
      "source": "https://premiostrega.it/PSE/libro/forse-esther/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/FB_PSE15_Petrowskaja_600px-mzytwt9hvwhnotdi9vwproh5py3ict2ija75f0yw7q.jpg",
      "id": "europe-2015-2296c67e"
    },
    {
      "year": 2014,
      "title": "Il tempo della vita",
      "author": "Marcos Giralt Torrente",
      "source": "https://premiostrega.it/PSE/libro/il-tempo-della-vita/",
      "cover": "https://premiostrega.it/PSE/wp-content/uploads/elementor/thumbs/FB_PSE14_Giralt_600px-mzytw4toy7k7ayd08lceyun69xfysodhrx8ixtz4pi.jpg",
      "id": "europe-2014-bd776328"
    }
  ],
  "booker": [
    {
      "year": 2025,
      "title": "Flesh",
      "author": "David Szalay",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2025-763ec590",
      "cover": "https://books.google.com/books/content?id=ZBQMEQAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl"
    },
    {
      "year": 2024,
      "title": "Orbital",
      "author": "Samantha Harvey",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2024-0f8fe345",
      "cover": "https://books.google.com/books/content?id=IKuW0AEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2023,
      "title": "Prophet Song",
      "author": "Paul Lynch",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2023-c8673955",
      "cover": "https://books.google.com/books/content?id=tYYf0AEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2022,
      "title": "The Seven Moons of Maali Almeida",
      "author": "Shehan Karunatilaka",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2022-5bc0ab9b",
      "cover": "https://books.google.com/books/content?id=oaxQzwEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2021,
      "title": "The Promise",
      "author": "Damon Galgut",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2021-796cfcc4",
      "cover": "https://books.google.com/books/content?id=Tb7VzQEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2020,
      "title": "Shuggie Bain",
      "author": "Douglas Stuart",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2020-0e9bf9c3",
      "cover": "https://books.google.com/books/content?id=xOgnzgEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2019,
      "title": "Girl, Woman, Other",
      "author": "Bernardine Evaristo",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2019-6dc61901",
      "cover": "https://books.google.com/books/content?id=3bZoyAEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2019,
      "title": "The Testaments",
      "author": "Margaret Atwood",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2019-3f3e1b0a",
      "cover": "https://books.google.com/books/content?id=CYG4vgEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2018,
      "title": "Milkman",
      "author": "Anna Burns",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2018-664db654",
      "cover": "https://books.google.com/books/content?id=Ta5PDwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl"
    },
    {
      "year": 2017,
      "title": "Lincoln in the Bardo",
      "author": "George Saunders",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2017-3a0bd474",
      "cover": "https://books.google.com/books/content?id=Lb4XMQAACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2016,
      "title": "The Sellout",
      "author": "Paul Beatty",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2016-684e3417",
      "cover": "https://books.google.com/books/content?id=EK8WvgAACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2015,
      "title": "A Brief History of Seven Killings",
      "author": "Marlon James",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2015-66f93348",
      "cover": "https://books.google.com/books/content?id=XE-XDAEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2014,
      "title": "The Narrow Road to the Deep North",
      "author": "Richard Flanagan",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2014-e3f412d4",
      "cover": "https://books.google.com/books/content?id=57VZAwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl"
    },
    {
      "year": 2013,
      "title": "The Luminaries",
      "author": "Eleanor Catton",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2013-e4acd3de",
      "cover": "https://books.google.com/books/content?id=NRO1rQEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2012,
      "title": "Bring Up the Bodies",
      "author": "Hilary Mantel",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2012-3ff63f03",
      "cover": "https://books.google.com/books/content?id=S3cYAwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl"
    },
    {
      "year": 2011,
      "title": "The Sense of an Ending",
      "author": "Julian Barnes",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2011-6b03ac33",
      "cover": "https://books.google.com/books/content?id=pa5paCaloKcC&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2010,
      "title": "The Finkler Question",
      "author": "Howard Jacobson",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2010-861fd6d6",
      "cover": "https://books.google.com/books/content?id=cxVE1lQIt5AC&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2009,
      "title": "Wolf Hall",
      "author": "Hilary Mantel",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2009-3ff63f03",
      "cover": "https://books.google.com/books/content?id=tGrw0AEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2008,
      "title": "The White Tiger",
      "author": "Aravind Adiga",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2008-5ca83775",
      "cover": "https://books.google.com/books/content?id=WWMengEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2007,
      "title": "The Gathering",
      "author": "Anne Enright",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2007-ac2f3ced",
      "cover": "https://books.google.com/books/content?id=gV39mAEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2006,
      "title": "The Inheritance of Loss",
      "author": "Kiran Desai",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2006-9b073205",
      "cover": "https://books.google.com/books/content?id=psHzNetWBDsC&printsec=frontcover&img=1&zoom=1&edge=curl"
    },
    {
      "year": 2005,
      "title": "The Sea",
      "author": "John Banville",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2005-25296785",
      "cover": "https://books.google.com/books/content?id=5zrxnAEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2004,
      "title": "The Line of Beauty",
      "author": "Alan Hollinghurst",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2004-46bc7476",
      "cover": "https://books.google.com/books/content?id=V8m-tAEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2003,
      "title": "Vernon God Little",
      "author": "DBC Pierre",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2003-afa2b985"
    },
    {
      "year": 2002,
      "title": "Life of Pi",
      "author": "Yann Martel",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2002-e04d356d",
      "cover": "https://books.google.com/books/content?id=hu11zwEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2001,
      "title": "True History of the Kelly Gang",
      "author": "Peter Carey",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2001-d468f47a",
      "cover": "https://books.google.com/books/content?id=p9OBqHpS6fUC&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2000,
      "title": "The Blind Assassin",
      "author": "Margaret Atwood",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-2000-3f3e1b0a",
      "cover": "https://books.google.com/books/content?id=tIxZLHvS0EIC&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1999,
      "title": "Disgrace",
      "author": "J. M. Coetzee",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1999-f558cd2d",
      "cover": "https://books.google.com/books/content?id=smLzPQAACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1998,
      "title": "Amsterdam",
      "author": "Ian McEwan",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1998-8ee929d5",
      "cover": "https://books.google.com/books/content?id=mtJC4XVjVfEC&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1997,
      "title": "The God of Small Things",
      "author": "Arundhati Roy",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1997-9f0cc64b",
      "cover": "https://books.google.com/books/content?id=mwVgQgAACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1996,
      "title": "Last Orders",
      "author": "Graham Swift",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1996-eff46873",
      "cover": "https://books.google.com/books/content?id=8tRstQAACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1995,
      "title": "The Ghost Road",
      "author": "Pat Barker",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1995-0aa21dab",
      "cover": "https://books.google.com/books/content?id=y1c-Li27dXMC&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1994,
      "title": "How late it was, how late",
      "author": "James Kelman",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1994-77896a96",
      "cover": "https://books.google.com/books/content?id=wIHWAAAAMAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1993,
      "title": "Paddy Clarke Ha Ha Ha",
      "author": "Roddy Doyle",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1993-04597671",
      "cover": "https://books.google.com/books/content?id=RHtRPgAACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1992,
      "title": "Sacred Hunger",
      "author": "Barry Unsworth",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1992-eaca8828",
      "cover": "https://books.google.com/books/content?id=Z4lbAAAAMAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1992,
      "title": "The English Patient",
      "author": "Michael Ondaatje",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1992-3e992f1b",
      "cover": "https://books.google.com/books/content?id=f_4ZvgAACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1991,
      "title": "The Famished Road",
      "author": "Ben Okri",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1991-ed5ee07f",
      "cover": "https://books.google.com/books/content?id=hbC7xBSOlFYC&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1990,
      "title": "Possession",
      "author": "A. S. Byatt",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1990-301d4478",
      "cover": "https://books.google.com/books/content?id=pydiC67FqZAC&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1989,
      "title": "The Remains of the Day",
      "author": "Kazuo Ishiguro",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1989-acbea396",
      "cover": "https://books.google.com/books/content?id=jbvUoQEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1988,
      "title": "Oscar and Lucinda",
      "author": "Peter Carey",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1988-d468f47a",
      "cover": "https://books.google.com/books/content?id=82PzAAAACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1987,
      "title": "Moon Tiger",
      "author": "Penelope Lively",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1987-15dc3037",
      "cover": "https://books.google.com/books/content?id=QAZbAAAAMAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1986,
      "title": "The Old Devils",
      "author": "Kingsley Amis",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1986-4a8d0709",
      "cover": "https://books.google.com/books/content?id=N_Kky-sIJ28C&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1985,
      "title": "The Bone People",
      "author": "Keri Hulme",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1985-c2f0652d",
      "cover": "https://books.google.com/books/content?id=eZbiPQAACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1984,
      "title": "Hotel du Lac",
      "author": "Anita Brookner",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1984-f0def163",
      "cover": "https://books.google.com/books/content?id=pLeAwzYHwMwC&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1983,
      "title": "Life and Times of Michael K",
      "author": "J. M. Coetzee",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1983-f558cd2d"
    },
    {
      "year": 1982,
      "title": "Schindler’s Ark",
      "author": "Thomas Keneally",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1982-75ca4f2c",
      "cover": "https://books.google.com/books/content?id=5RgwQAAACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1981,
      "title": "Midnight’s Children",
      "author": "Salman Rushdie",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1981-ea43e125",
      "cover": "https://books.google.com/books/content?id=x3VVPgAACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1980,
      "title": "Rites of Passage",
      "author": "William Golding",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1980-0e37189e"
    },
    {
      "year": 1979,
      "title": "Offshore",
      "author": "Penelope Fitzgerald",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1979-bb0f2d8b"
    },
    {
      "year": 1978,
      "title": "The Sea, the Sea",
      "author": "Iris Murdoch",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1978-8170abf7",
      "cover": "https://books.google.com/books/content?id=FCrRPAAACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1977,
      "title": "Staying On",
      "author": "Paul Scott",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1977-2088689a",
      "cover": "https://books.google.com/books/content?id=FjnLQhvxZkIC&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1976,
      "title": "Saville",
      "author": "David Storey",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1976-cbf75651",
      "cover": "https://books.google.com/books/content?id=a95A6vWA4bUC&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1975,
      "title": "Heat and Dust",
      "author": "Ruth Prawer Jhabvala",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1975-e5e118ba",
      "cover": "https://books.google.com/books/content?id=mIBLEAAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl"
    },
    {
      "year": 1974,
      "title": "The Conservationist",
      "author": "Nadine Gordimer",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1974-a315f04c"
    },
    {
      "year": 1974,
      "title": "Holiday",
      "author": "Stanley Middleton",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1974-beff4f06",
      "cover": "https://books.google.com/books/content?id=IU8IAQAAIAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1973,
      "title": "The Siege of Krishnapur",
      "author": "J. G. Farrell",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1973-35f4f777"
    },
    {
      "year": 1972,
      "title": "G.",
      "author": "John Berger",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1972-6c2cf279",
      "cover": "https://books.google.com/books/content?id=KVVaAAAAMAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1971,
      "title": "In a Free State",
      "author": "V. S. Naipaul",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1971-bc22b8d0",
      "cover": "https://books.google.com/books/content?id=9W2PEAAAQBAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1970,
      "title": "The Elected Member",
      "author": "Bernice Rubens",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1970-9a5214e4",
      "cover": "https://books.google.com/books/content?id=2FIvAQAAIAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 1969,
      "title": "Something to Answer For",
      "author": "P. H. Newby",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-booker-prize-winners-shortlisted-and-longlisted-authors",
      "id": "booker-1969-a5e34d93"
    }
  ],
  "international": [
    {
      "year": 2026,
      "title": "Taiwan Travelogue",
      "author": "Yáng Shuāng-zǐ",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-international-booker-prize-winners-shortlisted-authors-and-their-books",
      "id": "international-2026-6d592f58",
      "cover": "https://books.google.com/books/content?id=pQgUEQAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl"
    },
    {
      "year": 2025,
      "title": "Heart Lamp",
      "author": "Banu Mushtaq",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-international-booker-prize-winners-shortlisted-authors-and-their-books",
      "id": "international-2025-5f622e71",
      "cover": "https://books.google.com/books/content?id=MLxZ0QEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2024,
      "title": "Kairos",
      "author": "Jenny Erpenbeck",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-international-booker-prize-winners-shortlisted-authors-and-their-books",
      "id": "international-2024-abd8b36a",
      "cover": "https://books.google.com/books/content?id=RH8m0AEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2023,
      "title": "Time Shelter",
      "author": "Georgi Gospodinov",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-international-booker-prize-winners-shortlisted-authors-and-their-books",
      "id": "international-2023-dde3a304",
      "cover": "https://books.google.com/books/content?id=_NZpzgEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2022,
      "title": "Tomb of Sand",
      "author": "Geetanjali Shree",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-international-booker-prize-winners-shortlisted-authors-and-their-books",
      "id": "international-2022-a2594d30"
    },
    {
      "year": 2021,
      "title": "At Night All Blood Is Black",
      "author": "David Diop",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-international-booker-prize-winners-shortlisted-authors-and-their-books",
      "id": "international-2021-f86b0c10",
      "cover": "https://books.google.com/books/content?id=i_rJuQEACAAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2020,
      "title": "The Discomfort of Evening",
      "author": "Lucas Rijneveld",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-international-booker-prize-winners-shortlisted-authors-and-their-books",
      "id": "international-2020-6d95b730"
    },
    {
      "year": 2019,
      "title": "Celestial Bodies",
      "author": "Jokha Alharthi",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-international-booker-prize-winners-shortlisted-authors-and-their-books",
      "id": "international-2019-ff00864c",
      "cover": "https://books.google.com/books/content?id=zDSZDwAAQBAJ&printsec=frontcover&img=1&zoom=1"
    },
    {
      "year": 2018,
      "title": "Flights",
      "author": "Olga Tokarczuk",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-international-booker-prize-winners-shortlisted-authors-and-their-books",
      "id": "international-2018-fb2c881f"
    },
    {
      "year": 2017,
      "title": "A Horse Walks into a Bar",
      "author": "David Grossman",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-international-booker-prize-winners-shortlisted-authors-and-their-books",
      "id": "international-2017-8ffccfc4"
    },
    {
      "year": 2016,
      "title": "The Vegetarian",
      "author": "Han Kang",
      "source": "https://thebookerprizes.com/the-booker-library/features/full-list-of-international-booker-prize-winners-shortlisted-authors-and-their-books",
      "id": "international-2016-43dd9694"
    }
  ],
  "nobel": [
    {
      "year": 2026,
      "title": null,
      "author": "Anne Carson",
      "source": "https://www.nobelprize.org/prizes/literature/2026/summary/",
      "id": "nobel-2026-d9bf3dd1"
    },
    {
      "year": 2025,
      "title": null,
      "author": "László Krasznahorkai",
      "source": "https://www.nobelprize.org/prizes/literature/2025/summary/",
      "id": "nobel-2025-b7d31ea3"
    },
    {
      "year": 2024,
      "title": null,
      "author": "Han Kang",
      "source": "https://www.nobelprize.org/prizes/literature/2024/summary/",
      "id": "nobel-2024-43dd9694"
    },
    {
      "year": 2023,
      "title": null,
      "author": "Jon Fosse",
      "source": "https://www.nobelprize.org/prizes/literature/2023/summary/",
      "id": "nobel-2023-632caadc"
    },
    {
      "year": 2022,
      "title": null,
      "author": "Annie Ernaux",
      "source": "https://www.nobelprize.org/prizes/literature/2022/summary/",
      "id": "nobel-2022-e2314e02"
    },
    {
      "year": 2021,
      "title": null,
      "author": "Abdulrazak Gurnah",
      "source": "https://www.nobelprize.org/prizes/literature/2021/summary/",
      "id": "nobel-2021-7d741ca6"
    },
    {
      "year": 2020,
      "title": null,
      "author": "Louise Glück",
      "source": "https://www.nobelprize.org/prizes/literature/2020/summary/",
      "id": "nobel-2020-66d110d5"
    },
    {
      "year": 2019,
      "title": null,
      "author": "Peter Handke",
      "source": "https://www.nobelprize.org/prizes/literature/2019/summary/",
      "id": "nobel-2019-4903b487"
    },
    {
      "year": 2018,
      "title": null,
      "author": "Olga Tokarczuk",
      "source": "https://www.nobelprize.org/prizes/literature/2018/summary/",
      "id": "nobel-2018-fb2c881f"
    },
    {
      "year": 2017,
      "title": null,
      "author": "Kazuo Ishiguro",
      "source": "https://www.nobelprize.org/prizes/literature/2017/summary/",
      "id": "nobel-2017-acbea396"
    },
    {
      "year": 2016,
      "title": null,
      "author": "Bob Dylan",
      "source": "https://www.nobelprize.org/prizes/literature/2016/summary/",
      "id": "nobel-2016-bc85844e"
    },
    {
      "year": 2015,
      "title": null,
      "author": "Svetlana Alexievich",
      "source": "https://www.nobelprize.org/prizes/literature/2015/summary/",
      "id": "nobel-2015-5aec3b45"
    },
    {
      "year": 2014,
      "title": null,
      "author": "Patrick Modiano",
      "source": "https://www.nobelprize.org/prizes/literature/2014/summary/",
      "id": "nobel-2014-ae9f12fb"
    },
    {
      "year": 2013,
      "title": null,
      "author": "Alice Munro",
      "source": "https://www.nobelprize.org/prizes/literature/2013/summary/",
      "id": "nobel-2013-4ada7ce2"
    },
    {
      "year": 2012,
      "title": null,
      "author": "Mo Yan",
      "source": "https://www.nobelprize.org/prizes/literature/2012/summary/",
      "id": "nobel-2012-a7648139"
    },
    {
      "year": 2011,
      "title": null,
      "author": "Tomas Tranströmer",
      "source": "https://www.nobelprize.org/prizes/literature/2011/summary/",
      "id": "nobel-2011-47d769da"
    },
    {
      "year": 2010,
      "title": null,
      "author": "Mario Vargas Llosa",
      "source": "https://www.nobelprize.org/prizes/literature/2010/summary/",
      "id": "nobel-2010-70b43ad7"
    },
    {
      "year": 2009,
      "title": null,
      "author": "Herta Müller",
      "source": "https://www.nobelprize.org/prizes/literature/2009/summary/",
      "id": "nobel-2009-54201ef4"
    },
    {
      "year": 2008,
      "title": null,
      "author": "Jean-Marie Gustave Le Clézio",
      "source": "https://www.nobelprize.org/prizes/literature/2008/summary/",
      "id": "nobel-2008-ad5e54a3"
    },
    {
      "year": 2007,
      "title": null,
      "author": "Doris Lessing",
      "source": "https://www.nobelprize.org/prizes/literature/2007/summary/",
      "id": "nobel-2007-bf59bbf2"
    },
    {
      "year": 2006,
      "title": null,
      "author": "Orhan Pamuk",
      "source": "https://www.nobelprize.org/prizes/literature/2006/summary/",
      "id": "nobel-2006-ecb1d20f"
    },
    {
      "year": 2005,
      "title": null,
      "author": "Harold Pinter",
      "source": "https://www.nobelprize.org/prizes/literature/2005/summary/",
      "id": "nobel-2005-4cac8885"
    },
    {
      "year": 2004,
      "title": null,
      "author": "Elfriede Jelinek",
      "source": "https://www.nobelprize.org/prizes/literature/2004/summary/",
      "id": "nobel-2004-fbb5d826"
    },
    {
      "year": 2003,
      "title": null,
      "author": "J. M. Coetzee",
      "source": "https://www.nobelprize.org/prizes/literature/2003/summary/",
      "id": "nobel-2003-f558cd2d"
    },
    {
      "year": 2002,
      "title": null,
      "author": "Imre Kertész",
      "source": "https://www.nobelprize.org/prizes/literature/2002/summary/",
      "id": "nobel-2002-f095fefd"
    },
    {
      "year": 2001,
      "title": null,
      "author": "V. S. Naipaul",
      "source": "https://www.nobelprize.org/prizes/literature/2001/summary/",
      "id": "nobel-2001-bc22b8d0"
    },
    {
      "year": 2000,
      "title": null,
      "author": "Gao Xingjian",
      "source": "https://www.nobelprize.org/prizes/literature/2000/summary/",
      "id": "nobel-2000-f186462e"
    },
    {
      "year": 1999,
      "title": null,
      "author": "Günter Grass",
      "source": "https://www.nobelprize.org/prizes/literature/1999/summary/",
      "id": "nobel-1999-0fd48ed0"
    },
    {
      "year": 1998,
      "title": null,
      "author": "José Saramago",
      "source": "https://www.nobelprize.org/prizes/literature/1998/summary/",
      "id": "nobel-1998-b5ee9af8"
    },
    {
      "year": 1997,
      "title": null,
      "author": "Dario Fo",
      "source": "https://www.nobelprize.org/prizes/literature/1997/summary/",
      "id": "nobel-1997-12f6430a"
    },
    {
      "year": 1996,
      "title": null,
      "author": "Wisława Szymborska",
      "source": "https://www.nobelprize.org/prizes/literature/1996/summary/",
      "id": "nobel-1996-02a14223"
    },
    {
      "year": 1995,
      "title": null,
      "author": "Seamus Heaney",
      "source": "https://www.nobelprize.org/prizes/literature/1995/summary/",
      "id": "nobel-1995-5056862b"
    },
    {
      "year": 1994,
      "title": null,
      "author": "Kenzaburo Oe",
      "source": "https://www.nobelprize.org/prizes/literature/1994/summary/",
      "id": "nobel-1994-c6b80856"
    },
    {
      "year": 1993,
      "title": null,
      "author": "Toni Morrison",
      "source": "https://www.nobelprize.org/prizes/literature/1993/summary/",
      "id": "nobel-1993-be3e1ed5"
    },
    {
      "year": 1992,
      "title": null,
      "author": "Derek Walcott",
      "source": "https://www.nobelprize.org/prizes/literature/1992/summary/",
      "id": "nobel-1992-49924b39"
    },
    {
      "year": 1991,
      "title": null,
      "author": "Nadine Gordimer",
      "source": "https://www.nobelprize.org/prizes/literature/1991/summary/",
      "id": "nobel-1991-a315f04c"
    },
    {
      "year": 1990,
      "title": null,
      "author": "Octavio Paz",
      "source": "https://www.nobelprize.org/prizes/literature/1990/summary/",
      "id": "nobel-1990-5fdce3f4"
    },
    {
      "year": 1989,
      "title": null,
      "author": "Camilo José Cela",
      "source": "https://www.nobelprize.org/prizes/literature/1989/summary/",
      "id": "nobel-1989-e8f6cfa5"
    },
    {
      "year": 1988,
      "title": null,
      "author": "Naguib Mahfouz",
      "source": "https://www.nobelprize.org/prizes/literature/1988/summary/",
      "id": "nobel-1988-2e909b4c"
    },
    {
      "year": 1987,
      "title": null,
      "author": "Joseph Brodsky",
      "source": "https://www.nobelprize.org/prizes/literature/1987/summary/",
      "id": "nobel-1987-efac0e96"
    },
    {
      "year": 1986,
      "title": null,
      "author": "Wole Soyinka",
      "source": "https://www.nobelprize.org/prizes/literature/1986/summary/",
      "id": "nobel-1986-08c55575"
    },
    {
      "year": 1985,
      "title": null,
      "author": "Claude Simon",
      "source": "https://www.nobelprize.org/prizes/literature/1985/summary/",
      "id": "nobel-1985-d32b2b6a"
    },
    {
      "year": 1984,
      "title": null,
      "author": "Jaroslav Seifert",
      "source": "https://www.nobelprize.org/prizes/literature/1984/summary/",
      "id": "nobel-1984-4f9bbb76"
    },
    {
      "year": 1983,
      "title": null,
      "author": "William Golding",
      "source": "https://www.nobelprize.org/prizes/literature/1983/summary/",
      "id": "nobel-1983-0e37189e"
    },
    {
      "year": 1982,
      "title": null,
      "author": "Gabriel García Márquez",
      "source": "https://www.nobelprize.org/prizes/literature/1982/summary/",
      "id": "nobel-1982-990b3c6f"
    },
    {
      "year": 1981,
      "title": null,
      "author": "Elias Canetti",
      "source": "https://www.nobelprize.org/prizes/literature/1981/summary/",
      "id": "nobel-1981-2bae760c"
    },
    {
      "year": 1980,
      "title": null,
      "author": "Czesław Miłosz",
      "source": "https://www.nobelprize.org/prizes/literature/1980/summary/",
      "id": "nobel-1980-a8e61506"
    },
    {
      "year": 1979,
      "title": null,
      "author": "Odysseus Elytis",
      "source": "https://www.nobelprize.org/prizes/literature/1979/summary/",
      "id": "nobel-1979-10662f06"
    },
    {
      "year": 1978,
      "title": null,
      "author": "Isaac Bashevis Singer",
      "source": "https://www.nobelprize.org/prizes/literature/1978/summary/",
      "id": "nobel-1978-94749106"
    },
    {
      "year": 1977,
      "title": null,
      "author": "Vicente Aleixandre",
      "source": "https://www.nobelprize.org/prizes/literature/1977/summary/",
      "id": "nobel-1977-54b765be"
    },
    {
      "year": 1976,
      "title": null,
      "author": "Saul Bellow",
      "source": "https://www.nobelprize.org/prizes/literature/1976/summary/",
      "id": "nobel-1976-f156a8ac"
    },
    {
      "year": 1975,
      "title": null,
      "author": "Eugenio Montale",
      "source": "https://www.nobelprize.org/prizes/literature/1975/summary/",
      "id": "nobel-1975-3a99ee31"
    },
    {
      "year": 1974,
      "title": null,
      "author": "Eyvind Johnson",
      "source": "https://www.nobelprize.org/prizes/literature/1974/summary/",
      "id": "nobel-1974-4e342627"
    },
    {
      "year": 1974,
      "title": null,
      "author": "Harry Martinson",
      "source": "https://www.nobelprize.org/prizes/literature/1974/summary/",
      "id": "nobel-1974-6f70b37e"
    },
    {
      "year": 1973,
      "title": null,
      "author": "Patrick White",
      "source": "https://www.nobelprize.org/prizes/literature/1973/summary/",
      "id": "nobel-1973-32902727"
    },
    {
      "year": 1972,
      "title": null,
      "author": "Heinrich Böll",
      "source": "https://www.nobelprize.org/prizes/literature/1972/summary/",
      "id": "nobel-1972-934327ac"
    },
    {
      "year": 1971,
      "title": null,
      "author": "Pablo Neruda",
      "source": "https://www.nobelprize.org/prizes/literature/1971/summary/",
      "id": "nobel-1971-c4a87e7a"
    },
    {
      "year": 1970,
      "title": null,
      "author": "Aleksandr Solzhenitsyn",
      "source": "https://www.nobelprize.org/prizes/literature/1970/summary/",
      "id": "nobel-1970-e16a69a2"
    },
    {
      "year": 1969,
      "title": null,
      "author": "Samuel Beckett",
      "source": "https://www.nobelprize.org/prizes/literature/1969/summary/",
      "id": "nobel-1969-ee55467d"
    },
    {
      "year": 1968,
      "title": null,
      "author": "Yasunari Kawabata",
      "source": "https://www.nobelprize.org/prizes/literature/1968/summary/",
      "id": "nobel-1968-0fc2b509"
    },
    {
      "year": 1967,
      "title": null,
      "author": "Miguel Angel Asturias",
      "source": "https://www.nobelprize.org/prizes/literature/1967/summary/",
      "id": "nobel-1967-9f4ba187"
    },
    {
      "year": 1966,
      "title": null,
      "author": "Nelly Sachs",
      "source": "https://www.nobelprize.org/prizes/literature/1966/summary/",
      "id": "nobel-1966-e6b742f8"
    },
    {
      "year": 1966,
      "title": null,
      "author": "Shmuel Agnon",
      "source": "https://www.nobelprize.org/prizes/literature/1966/summary/",
      "id": "nobel-1966-bf23d687"
    },
    {
      "year": 1965,
      "title": null,
      "author": "Mikhail Sholokhov",
      "source": "https://www.nobelprize.org/prizes/literature/1965/summary/",
      "id": "nobel-1965-00638216"
    },
    {
      "year": 1964,
      "title": null,
      "author": "Jean-Paul Sartre",
      "source": "https://www.nobelprize.org/prizes/literature/1964/summary/",
      "id": "nobel-1964-4a135ae7"
    },
    {
      "year": 1963,
      "title": null,
      "author": "Giorgos Seferis",
      "source": "https://www.nobelprize.org/prizes/literature/1963/summary/",
      "id": "nobel-1963-81a80a3b"
    },
    {
      "year": 1962,
      "title": null,
      "author": "John Steinbeck",
      "source": "https://www.nobelprize.org/prizes/literature/1962/summary/",
      "id": "nobel-1962-a03aa66a"
    },
    {
      "year": 1961,
      "title": null,
      "author": "Ivo Andrić",
      "source": "https://www.nobelprize.org/prizes/literature/1961/summary/",
      "id": "nobel-1961-5848c94c"
    },
    {
      "year": 1960,
      "title": null,
      "author": "Saint-John Perse",
      "source": "https://www.nobelprize.org/prizes/literature/1960/summary/",
      "id": "nobel-1960-f1669658"
    },
    {
      "year": 1959,
      "title": null,
      "author": "Salvatore Quasimodo",
      "source": "https://www.nobelprize.org/prizes/literature/1959/summary/",
      "id": "nobel-1959-22f1a088"
    },
    {
      "year": 1958,
      "title": null,
      "author": "Boris Pasternak",
      "source": "https://www.nobelprize.org/prizes/literature/1958/summary/",
      "id": "nobel-1958-017396b3"
    },
    {
      "year": 1957,
      "title": null,
      "author": "Albert Camus",
      "source": "https://www.nobelprize.org/prizes/literature/1957/summary/",
      "id": "nobel-1957-ac79aa1b"
    },
    {
      "year": 1956,
      "title": null,
      "author": "Juan Ramón Jiménez",
      "source": "https://www.nobelprize.org/prizes/literature/1956/summary/",
      "id": "nobel-1956-fdc01b23"
    },
    {
      "year": 1955,
      "title": null,
      "author": "Halldór Laxness",
      "source": "https://www.nobelprize.org/prizes/literature/1955/summary/",
      "id": "nobel-1955-31cfc755"
    },
    {
      "year": 1954,
      "title": null,
      "author": "Ernest Hemingway",
      "source": "https://www.nobelprize.org/prizes/literature/1954/summary/",
      "id": "nobel-1954-6184df97"
    },
    {
      "year": 1953,
      "title": null,
      "author": "Winston Churchill",
      "source": "https://www.nobelprize.org/prizes/literature/1953/summary/",
      "id": "nobel-1953-51e129f9"
    },
    {
      "year": 1952,
      "title": null,
      "author": "François Mauriac",
      "source": "https://www.nobelprize.org/prizes/literature/1952/summary/",
      "id": "nobel-1952-cd411fb1"
    },
    {
      "year": 1951,
      "title": null,
      "author": "Pär Lagerkvist",
      "source": "https://www.nobelprize.org/prizes/literature/1951/summary/",
      "id": "nobel-1951-262dfd73"
    },
    {
      "year": 1950,
      "title": null,
      "author": "Bertrand Russell",
      "source": "https://www.nobelprize.org/prizes/literature/1950/summary/",
      "id": "nobel-1950-fd26fb6f"
    },
    {
      "year": 1949,
      "title": null,
      "author": "William Faulkner",
      "source": "https://www.nobelprize.org/prizes/literature/1949/summary/",
      "id": "nobel-1949-bc482fc4"
    },
    {
      "year": 1948,
      "title": null,
      "author": "T.S. Eliot",
      "source": "https://www.nobelprize.org/prizes/literature/1948/summary/",
      "id": "nobel-1948-28b4e55e"
    },
    {
      "year": 1947,
      "title": null,
      "author": "André Gide",
      "source": "https://www.nobelprize.org/prizes/literature/1947/summary/",
      "id": "nobel-1947-b11e4276"
    },
    {
      "year": 1946,
      "title": null,
      "author": "Hermann Hesse",
      "source": "https://www.nobelprize.org/prizes/literature/1946/summary/",
      "id": "nobel-1946-c43b9689"
    },
    {
      "year": 1945,
      "title": null,
      "author": "Gabriela Mistral",
      "source": "https://www.nobelprize.org/prizes/literature/1945/summary/",
      "id": "nobel-1945-0ad75e41"
    },
    {
      "year": 1944,
      "title": null,
      "author": "Johannes V. Jensen",
      "source": "https://www.nobelprize.org/prizes/literature/1944/summary/",
      "id": "nobel-1944-7d5100fc"
    },
    {
      "year": 1939,
      "title": null,
      "author": "Frans Eemil Sillanpää",
      "source": "https://www.nobelprize.org/prizes/literature/1939/summary/",
      "id": "nobel-1939-98720e55"
    },
    {
      "year": 1938,
      "title": null,
      "author": "Pearl Buck",
      "source": "https://www.nobelprize.org/prizes/literature/1938/summary/",
      "id": "nobel-1938-6d635a22"
    },
    {
      "year": 1937,
      "title": null,
      "author": "Roger Martin du Gard",
      "source": "https://www.nobelprize.org/prizes/literature/1937/summary/",
      "id": "nobel-1937-80e3f1aa"
    },
    {
      "year": 1936,
      "title": null,
      "author": "Eugene O'Neill",
      "source": "https://www.nobelprize.org/prizes/literature/1936/summary/",
      "id": "nobel-1936-ca7f9eda"
    },
    {
      "year": 1934,
      "title": null,
      "author": "Luigi Pirandello",
      "source": "https://www.nobelprize.org/prizes/literature/1934/summary/",
      "id": "nobel-1934-791b0991"
    },
    {
      "year": 1933,
      "title": null,
      "author": "Ivan Bunin",
      "source": "https://www.nobelprize.org/prizes/literature/1933/summary/",
      "id": "nobel-1933-1c40aef8"
    },
    {
      "year": 1932,
      "title": null,
      "author": "John Galsworthy",
      "source": "https://www.nobelprize.org/prizes/literature/1932/summary/",
      "id": "nobel-1932-0a231fbc"
    },
    {
      "year": 1931,
      "title": null,
      "author": "Erik Axel Karlfeldt",
      "source": "https://www.nobelprize.org/prizes/literature/1931/summary/",
      "id": "nobel-1931-f46f9809"
    },
    {
      "year": 1930,
      "title": null,
      "author": "Sinclair Lewis",
      "source": "https://www.nobelprize.org/prizes/literature/1930/summary/",
      "id": "nobel-1930-17ce4954"
    },
    {
      "year": 1929,
      "title": null,
      "author": "Thomas Mann",
      "source": "https://www.nobelprize.org/prizes/literature/1929/summary/",
      "id": "nobel-1929-dc7505ec"
    },
    {
      "year": 1928,
      "title": null,
      "author": "Sigrid Undset",
      "source": "https://www.nobelprize.org/prizes/literature/1928/summary/",
      "id": "nobel-1928-c511a12f"
    },
    {
      "year": 1927,
      "title": null,
      "author": "Henri Bergson",
      "source": "https://www.nobelprize.org/prizes/literature/1927/summary/",
      "id": "nobel-1927-ddf707bd"
    },
    {
      "year": 1926,
      "title": null,
      "author": "Grazia Deledda",
      "source": "https://www.nobelprize.org/prizes/literature/1926/summary/",
      "id": "nobel-1926-f4749622"
    },
    {
      "year": 1925,
      "title": null,
      "author": "George Bernard Shaw",
      "source": "https://www.nobelprize.org/prizes/literature/1925/summary/",
      "id": "nobel-1925-ab7d015b"
    },
    {
      "year": 1924,
      "title": null,
      "author": "Władysław Reymont",
      "source": "https://www.nobelprize.org/prizes/literature/1924/summary/",
      "id": "nobel-1924-c3db7a0a"
    },
    {
      "year": 1923,
      "title": null,
      "author": "William Butler Yeats",
      "source": "https://www.nobelprize.org/prizes/literature/1923/summary/",
      "id": "nobel-1923-c68fe165"
    },
    {
      "year": 1922,
      "title": null,
      "author": "Jacinto Benavente",
      "source": "https://www.nobelprize.org/prizes/literature/1922/summary/",
      "id": "nobel-1922-aa8f247b"
    },
    {
      "year": 1921,
      "title": null,
      "author": "Anatole France",
      "source": "https://www.nobelprize.org/prizes/literature/1921/summary/",
      "id": "nobel-1921-c9e52b4e"
    },
    {
      "year": 1920,
      "title": null,
      "author": "Knut Hamsun",
      "source": "https://www.nobelprize.org/prizes/literature/1920/summary/",
      "id": "nobel-1920-855eeeb1"
    },
    {
      "year": 1919,
      "title": null,
      "author": "Carl Spitteler",
      "source": "https://www.nobelprize.org/prizes/literature/1919/summary/",
      "id": "nobel-1919-2984847a"
    },
    {
      "year": 1917,
      "title": null,
      "author": "Henrik Pontoppidan",
      "source": "https://www.nobelprize.org/prizes/literature/1917/summary/",
      "id": "nobel-1917-b78e91c1"
    },
    {
      "year": 1917,
      "title": null,
      "author": "Karl Gjellerup",
      "source": "https://www.nobelprize.org/prizes/literature/1917/summary/",
      "id": "nobel-1917-54b6e23e"
    },
    {
      "year": 1916,
      "title": null,
      "author": "Verner von Heidenstam",
      "source": "https://www.nobelprize.org/prizes/literature/1916/summary/",
      "id": "nobel-1916-28436d3d"
    },
    {
      "year": 1915,
      "title": null,
      "author": "Romain Rolland",
      "source": "https://www.nobelprize.org/prizes/literature/1915/summary/",
      "id": "nobel-1915-72d93b18"
    },
    {
      "year": 1913,
      "title": null,
      "author": "Rabindranath Tagore",
      "source": "https://www.nobelprize.org/prizes/literature/1913/summary/",
      "id": "nobel-1913-b88f31f2"
    },
    {
      "year": 1912,
      "title": null,
      "author": "Gerhart Hauptmann",
      "source": "https://www.nobelprize.org/prizes/literature/1912/summary/",
      "id": "nobel-1912-c110af9c"
    },
    {
      "year": 1911,
      "title": null,
      "author": "Maurice Maeterlinck",
      "source": "https://www.nobelprize.org/prizes/literature/1911/summary/",
      "id": "nobel-1911-3192ffe0"
    },
    {
      "year": 1910,
      "title": null,
      "author": "Paul Heyse",
      "source": "https://www.nobelprize.org/prizes/literature/1910/summary/",
      "id": "nobel-1910-94f7c050"
    },
    {
      "year": 1909,
      "title": null,
      "author": "Selma Lagerlöf",
      "source": "https://www.nobelprize.org/prizes/literature/1909/summary/",
      "id": "nobel-1909-47228970"
    },
    {
      "year": 1908,
      "title": null,
      "author": "Rudolf Eucken",
      "source": "https://www.nobelprize.org/prizes/literature/1908/summary/",
      "id": "nobel-1908-46e66eff"
    },
    {
      "year": 1907,
      "title": null,
      "author": "Rudyard Kipling",
      "source": "https://www.nobelprize.org/prizes/literature/1907/summary/",
      "id": "nobel-1907-fec4a14d"
    },
    {
      "year": 1906,
      "title": null,
      "author": "Giosuè Carducci",
      "source": "https://www.nobelprize.org/prizes/literature/1906/summary/",
      "id": "nobel-1906-b0e24855"
    },
    {
      "year": 1905,
      "title": null,
      "author": "Henryk Sienkiewicz",
      "source": "https://www.nobelprize.org/prizes/literature/1905/summary/",
      "id": "nobel-1905-dab988d9"
    },
    {
      "year": 1904,
      "title": null,
      "author": "Frédéric Mistral",
      "source": "https://www.nobelprize.org/prizes/literature/1904/summary/",
      "id": "nobel-1904-cba20f3d"
    },
    {
      "year": 1904,
      "title": null,
      "author": "José Echegaray",
      "source": "https://www.nobelprize.org/prizes/literature/1904/summary/",
      "id": "nobel-1904-ba59b277"
    },
    {
      "year": 1903,
      "title": null,
      "author": "Bjørnstjerne Bjørnson",
      "source": "https://www.nobelprize.org/prizes/literature/1903/summary/",
      "id": "nobel-1903-0bcb6ced"
    },
    {
      "year": 1902,
      "title": null,
      "author": "Theodor Mommsen",
      "source": "https://www.nobelprize.org/prizes/literature/1902/summary/",
      "id": "nobel-1902-3fc5ff3b"
    },
    {
      "year": 1901,
      "title": null,
      "author": "Sully Prudhomme",
      "source": "https://www.nobelprize.org/prizes/literature/1901/summary/",
      "id": "nobel-1901-03541863"
    }
  ]
};
