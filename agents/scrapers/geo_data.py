"""
Centralized Geographic Reference Data & Heuristics for Tech Scrapers.
Provides normalized country codes, canonical English city names,
company headquarters mapping, and Danish municipal normalization.
"""

from typing import Dict, Tuple, List, Optional
import re

# ── 1. Company Headquarters Default Locations ────────────────────────────
COMPANY_DEFAULT_LOCATIONS: Dict[str, Tuple[str, str]] = {
    # Nordic Tech & ATS
    "netnordic": ("NO", "Oslo"),
    "dfds": ("DK", "Copenhagen"),
    "securitas": ("SE", "Stockholm"),
    "gire": ("NO", "Oslo"),
    "polestar": ("SE", "Gothenburg"),
    "bankdata": ("DK", "Silkeborg"),
    "puzzel": ("NO", "Oslo"),
    "vitecsoftware": ("SE", "Umeå"),
    "envidan": ("DK", "Silkeborg"),
    "labster": ("DK", "Copenhagen"),
    "podimo": ("DK", "Copenhagen"),
    "lunar": ("DK", "Aarhus"),
    "vivino": ("DK", "Copenhagen"),
    "tibber": ("SE", "Stockholm"),
    "mercantec": ("DK", "Viborg"),

    # Ukrainian Tech Ecosystem
    "grammarly": ("UA", "Kyiv"),
    "macpaw": ("UA", "Kyiv"),
    "ajax": ("UA", "Kyiv"),
    "genesis": ("UA", "Kyiv"),
    "softserve": ("UA", "Lviv"),
    "epam": ("UA", "Kyiv"),
    "luxoft": ("UA", "Kyiv"),
    "globallogic": ("UA", "Kyiv"),
    "intellias": ("UA", "Lviv"),
    "eleks": ("UA", "Lviv"),
    "ciklum": ("UA", "Kyiv"),
    "sigma": ("UA", "Kharkiv"),
    "n-ix": ("UA", "Lviv"),

    # European Tech Hubs
    "spotify": ("SE", "Stockholm"),
    "klarna": ("SE", "Stockholm"),
    "asml": ("NL", "Amsterdam"),
    "booking": ("NL", "Amsterdam"),
    "adyen": ("NL", "Amsterdam"),
    "deliveryhero": ("DE", "Berlin"),
    "zalando": ("DE", "Berlin"),
    "sap": ("DE", "Munich"),
    "revolut": ("UK", "London"),
    "monzo": ("UK", "London"),
    "deepmind": ("UK", "London"),
    "allegro": ("PL", "Warsaw"),
    "cdprojekt": ("PL", "Warsaw"),
}

# ── 2. Danish Municipalities & Region Normalization ───────────────────────
DANISH_COMMUNES_TO_CITIES: Dict[str, str] = {
    "viborg": "Viborg",
    "silkeborg": "Silkeborg",
    "aarhus": "Aarhus",
    "århus": "Aarhus",
    "københavn": "Copenhagen",
    "copenhagen": "Copenhagen",
    "odense": "Odense",
    "aalborg": "Aalborg",
    "ålborg": "Aalborg",
    "herning": "Herning",
    "horsens": "Horsens",
    "randers": "Randers",
    "vejle": "Vejle",
    "kolding": "Kolding",
    "esbjerg": "Esbjerg",
    "skive": "Skive",
    "holstebro": "Holstebro",
    "hillerød": "Hillerød",
    "helsingør": "Helsingør",
    "roskilde": "Roskilde",
}

# ── 3. Regex Pattern -> (CountryCode, CanonicalEnglishCity) ───────────────
LOCATION_PATTERNS: List[Tuple[str, Tuple[str, str]]] = [
    # ── Ukraine (Cities & Country) with grammatical inflections ──
    (r"\b(kyiv|kiev|ки[їєе]в\w*)\b", ("UA", "Kyiv")),
    (r"\b(lviv|lvov|льв[ііоо]в\w*)\b", ("UA", "Lviv")),
    (r"\b(kharkiv|kharkov|харк[ііоо]в\w*)\b", ("UA", "Kharkiv")),
    (r"\b(odesa|odessa|одес\w*)\b", ("UA", "Odesa")),
    (r"\b(dnipro|dnepr|dnepropetrovsk|дн[іе]пр\w*)\b", ("UA", "Dnipro")),
    (r"\b(zaporizhzhia|zaporozhye|запор[ііoо]ж\w*)\b", ("UA", "Zaporizhzhia")),
    (r"\b(vinnytsia|vinnitsa|в[іи]нниц\w*)\b", ("UA", "Vinnytsia")),
    (r"\b(poltava|полтав\w*)\b", ("UA", "Poltava")),
    (r"\b(chernihiv|chernigov|черн[ііoо]г\w*)\b", ("UA", "Chernihiv")),
    (r"\b(cherkasy|cherkassy|черкас\w*)\b", ("UA", "Cherkasy")),
    (r"\b(ivano-frankivsk|івано-франк\w*|ивано-франк\w*)\b", ("UA", "Ivano-Frankivsk")),
    (r"\b(uzhhorod|uzhgorod|ужгород\w*)\b", ("UA", "Uzhhorod")),
    (r"\b(ternopil|ternopol|терноп[ііоо]л\w*)\b", ("UA", "Ternopil")),
    (r"\b(lutsk|луцьк\w*|луцк\w*)\b", ("UA", "Lutsk")),
    (r"\b(rivne|rovno|р[ііoо]вн\w*)\b", ("UA", "Rivne")),
    (r"\b(mykolaiv|nikolaev|микола[їєе]в\w*|николаев\w*)\b", ("UA", "Mykolaiv")),
    (r"\b(zhytomyr|zhitomir|житомир\w*)\b", ("UA", "Zhytomyr")),
    (r"\b(chernivtsi|chernovtsy|черн[ііoо]вц\w*)\b", ("UA", "Chernivtsi")),
    (r"\b(khmelnytskyi|khmelnitsky|хмельниц\w*)\b", ("UA", "Khmelnytskyi")),
    (r"\b(sumy|сум[иа]\w*)\b", ("UA", "Sumy")),
    (r"\b(kryvyi\s*rih|krivoy\s*rog|крив\w*\s*р[ііoо]г\w*)\b", ("UA", "Kryvyi Rih")),
    (r"\b(ukraine|укра[їи]н\w*)\b", ("UA", "Kyiv")),

    # ── Poland ──
    (r"\b(warsaw|warszawa|варшав\w*)\b", ("PL", "Warsaw")),
    (r"\b(krak[óo]w|крак[ііоо]в\w*)\b", ("PL", "Krakow")),
    (r"\b(wroc[łl]aw|вроцлав\w*)\b", ("PL", "Wroclaw")),
    (r"\b(gda[ńn]sk|гданськ\w*|гданьск\w*)\b", ("PL", "Gdansk")),
    (r"\b(pozna[ńn]|познан\w*)\b", ("PL", "Poznan")),
    (r"\b([łl][óo]d[źz]|лодз\w*)\b", ("PL", "Lodz")),
    (r"\b(katowice|катов[іі]ц\w*)\b", ("PL", "Katowice")),
    (r"\b(poland|polska|польщ\w*|польш\w*)\b", ("PL", "Warsaw")),

    # ── Germany ──
    (r"\b(berlin|берл[іі]н\w*)\b", ("DE", "Berlin")),
    (r"\b(munich|münchen|мюнхен\w*)\b", ("DE", "Munich")),
    (r"\b(hamburg|гамбург\w*)\b", ("DE", "Hamburg")),
    (r"\b(frankfurt|франкфурт\w*)\b", ("DE", "Frankfurt")),
    (r"\b(cologne|k[öo]ln|кельн\w*)\b", ("DE", "Cologne")),
    (r"\b(stuttgart|штутгарт\w*)\b", ("DE", "Stuttgart")),
    (r"\b(d[üu]sseldorf|дюссельдорф\w*)\b", ("DE", "Dusseldorf")),
    (r"\b(germany|deutschland|н[іе]меччин\w*|германи\w*)\b", ("DE", "Berlin")),

    # ── Denmark ──
    (r"\b(copenhagen|københavn|копенгаген\w*)\b", ("DK", "Copenhagen")),
    (r"\b(aarhus|århus|орхус\w*)\b", ("DK", "Aarhus")),
    (r"\b(odense|оденсе)\b", ("DK", "Odense")),
    (r"\b(aalborg|ålborg|ольборг)\b", ("DK", "Aalborg")),
    (r"\b(silkeborg|сількеборг\w*)\b", ("DK", "Silkeborg")),
    (r"\b(viborg|віборг\w*)\b", ("DK", "Viborg")),
    (r"\b(herning|хернінг\w*)\b", ("DK", "Herning")),
    (r"\b(horsens|хорсенс\w*)\b", ("DK", "Horsens")),
    (r"\b(vejle|вайле\w*)\b", ("DK", "Vejle")),
    (r"\b(randers|раннерс\w*)\b", ("DK", "Randers")),
    (r"\b(kolding|колдінг\w*)\b", ("DK", "Kolding")),
    (r"\b(esbjerg|есб'єрг\w*)\b", ("DK", "Esbjerg")),
    (r"\b(roskilde|роскілле\w*)\b", ("DK", "Roskilde")),
    (r"\b(hillerød|хіллеред\w*)\b", ("DK", "Hillerød")),
    (r"\b(denmark|danmark|дан[іі]я\w*)\b", ("DK", "Copenhagen")),

    # ── Sweden ──
    (r"\b(stockholm|стокгольм\w*)\b", ("SE", "Stockholm")),
    (r"\b(gothenburg|göteborg|гетеборг\w*)\b", ("SE", "Gothenburg")),
    (r"\b(malm[öo]|мальм[еöо]\w*)\b", ("SE", "Malmo")),
    (r"\b(uppsala|уппсала\w*)\b", ("SE", "Uppsala")),
    (r"\b(ume[åa]|умео\w*)\b", ("SE", "Umeå")),
    (r"\b(sweden|sverige|швец[іі]я\w*)\b", ("SE", "Stockholm")),

    # ── Norway ──
    (r"\b(oslo|осло)\b", ("NO", "Oslo")),
    (r"\b(bergen|берген\w*)\b", ("NO", "Bergen")),
    (r"\b(trondheim|тронгейм\w*|тронхейм\w*)\b", ("NO", "Trondheim")),
    (r"\b(stavanger|ставангер\w*)\b", ("NO", "Stavanger")),
    (r"\b(norway|norge|норвег[іі]я\w*)\b", ("NO", "Oslo")),

    # ── Finland ──
    (r"\b(helsinki|гельс[іі]нк\w*|хельсинк\w*)\b", ("FI", "Helsinki")),
    (r"\b(espoo|еспоо)\b", ("FI", "Espoo")),
    (r"\b(tampere|тампере)\b", ("FI", "Tampere")),
    (r"\b(oulu|оулу)\b", ("FI", "Oulu")),
    (r"\b(finland|suomi|ф[іі]нлянд[іі]я\w*)\b", ("FI", "Helsinki")),

    # ── United Kingdom ──
    (r"\b(london|лондон\w*)\b", ("UK", "London")),
    (r"\b(manchester|манчестер\w*)\b", ("UK", "Manchester")),
    (r"\b(edinburgh|единбург\w*|эдинбург\w*)\b", ("UK", "Edinburgh")),
    (r"\b(cambridge|кембридж\w*|кембрідж\w*)\b", ("UK", "Cambridge")),
    (r"\b(oxford|оксфорд\w*)\b", ("UK", "Oxford")),
    (r"\b(bristol|бр[іі]столь\w*)\b", ("UK", "Bristol")),
    (r"\b(united\s*kingdom|uk|great\s*britain|велика\s*британ[іі]я\w*|великобритани\w*)\b", ("UK", "London")),

    # ── Netherlands ──
    (r"\b(amsterdam|амстердам\w*)\b", ("NL", "Amsterdam")),
    (r"\b(rotterdam|роттердам\w*)\b", ("NL", "Rotterdam")),
    (r"\b(utrecht|утрехт\w*)\b", ("NL", "Utrecht")),
    (r"\b(eindhoven|ейндговен\w*|эйндховен\w*)\b", ("NL", "Eindhoven")),
    (r"\b(hague|den\s*haag|гааг\w*)\b", ("NL", "The Hague")),
    (r"\b(netherlands|holland|н[іі]дерланд\w*|голланді\w*)\b", ("NL", "Amsterdam")),

    # ── Switzerland ──
    (r"\b(zurich|zürich|цюр[іі]х\w*)\b", ("CH", "Zurich")),
    (r"\b(geneva|gen[èe]ve|женев\w*)\b", ("CH", "Geneva")),
    (r"\b(lausanne|лозанн\w*)\b", ("CH", "Lausanne")),
    (r"\b(basel|базель\w*)\b", ("CH", "Basel")),
    (r"\b(switzerland|schweiz|suisse|швейцар[іі]я\w*)\b", ("CH", "Zurich")),

    # ── France ──
    (r"\b(paris|париж\w*)\b", ("FR", "Paris")),
    (r"\b(lyon|л[іі]он\w*)\b", ("FR", "Lyon")),
    (r"\b(toulouse|тулуз\w*)\b", ("FR", "Toulouse")),
    (r"\b(france|франц[іі]я\w*)\b", ("FR", "Paris")),

    # ── Austria ──
    (r"\b(vienna|wien|в[іе]д[еі]н\w*|вен[ае]\w*)\b", ("AT", "Vienna")),
    (r"\b(graz|грац\w*)\b", ("AT", "Graz")),
    (r"\b(austria|österreich|австр[іі]я\w*)\b", ("AT", "Vienna")),

    # ── Ireland ──
    (r"\b(dublin|дубл[іі]н\w*)\b", ("IE", "Dublin")),
    (r"\b(cork|корк\w*)\b", ("IE", "Cork")),
    (r"\b(ireland|[іи]рланд[іі]я\w*)\b", ("IE", "Dublin")),

    # ── Spain ──
    (r"\b(madrid|мадрид\w*)\b", ("ES", "Madrid")),
    (r"\b(barcelona|барселон\w*)\b", ("ES", "Barcelona")),
    (r"\b(valencia|валенс[іі]я\w*)\b", ("ES", "Valencia")),
    (r"\b(malaga|málaga|малаг\w*)\b", ("ES", "Malaga")),
    (r"\b(spain|españa|[іи]спан[іі]я\w*)\b", ("ES", "Madrid")),

    # ── Portugal ──
    (r"\b(lisbon|lisboa|л[іі]сабон\w*|лиссабон\w*)\b", ("PT", "Lisbon")),
    (r"\b(porto|порту)\b", ("PT", "Porto")),
    (r"\b(portugal|португал[іі]я\w*)\b", ("PT", "Lisbon")),

    # ── Italy ──
    (r"\b(rome|roma|рим\w*)\b", ("IT", "Rome")),
    (r"\b(milan|milano|м[іі]лан\w*)\b", ("IT", "Milan")),
    (r"\b(italy|italia|[іи]тал[іі]я\w*)\b", ("IT", "Rome")),

    # ── Czechia & Slovakia ──
    (r"\b(prague|praha|праг\w*)\b", ("CZ", "Prague")),
    (r"\b(brno|брно)\b", ("CZ", "Brno")),
    (r"\b(czech\s*republic|czechia|cesko|чех[іі]я\w*)\b", ("CZ", "Prague")),
    (r"\b(bratislava|братислав\w*)\b", ("SK", "Bratislava")),
    (r"\b(slovakia|slovensko|словаччин\w*|словаки\w*)\b", ("SK", "Bratislava")),

    # ── Hungary, Romania, Bulgaria ──
    (r"\b(budapest|будапешт\w*)\b", ("HU", "Budapest")),
    (r"\b(hungary|magyarország|угорщин\w*|венгри\w*)\b", ("HU", "Budapest")),
    (r"\b(bucharest|bucurești|бухарест\w*)\b", ("RO", "Bucharest")),
    (r"\b(cluj|клуж\w*)\b", ("RO", "Cluj-Napoca")),
    (r"\b(romania|românia|румун[іі]я\w*)\b", ("RO", "Bucharest")),
    (r"\b(sofia|соф[іі]я\w*|соф[іі][їе]й?\w*)\b", ("BG", "Sofia")),
    (r"\b(bulgaria|болгар[іі]я\w*)\b", ("BG", "Sofia")),

    # ── Baltics ──
    (r"\b(tallinn|талл[іі]н\w*)\b", ("EE", "Tallinn")),
    (r"\b(estonia|eesti|естон[іі]я\w*)\b", ("EE", "Tallinn")),
    (r"\b(riga|риг\w*)\b", ("LV", "Riga")),
    (r"\b(latvia|latvija|латв[іі]я\w*)\b", ("LV", "Riga")),
    (r"\b(vilnius|в[іі]льнюс\w*)\b", ("LT", "Vilnius")),
    (r"\b(lithuania|lietuva|литв\w*)\b", ("LT", "Vilnius")),

    # ── Belgium, Greece, Cyprus ──
    (r"\b(brussels|bruxelles|брюссел\w*)\b", ("BE", "Brussels")),
    (r"\b(belgium|belgique|belgië|бельг[іі]я\w*)\b", ("BE", "Brussels")),
    (r"\b(athens|аф[іі]н\w*)\b", ("GR", "Athens")),
    (r"\b(greece|грец[іі]я\w*)\b", ("GR", "Athens")),
    (r"\b(limassol|л[іи]масол\w*)\b", ("CY", "Limassol")),
    (r"\b(cyprus|к[іи]пр\w*)\b", ("CY", "Limassol")),

    # ── North America ──
    (r"\b(san\s*francisco|bay\s*area|silicon\s*valley)\b", ("US", "San Francisco")),
    (r"\b(new\s*york|nyc)\b", ("US", "New York")),
    (r"\b(seattle)\b", ("US", "Seattle")),
    (r"\b(austin)\b", ("US", "Austin")),
    (r"\b(boston)\b", ("US", "Boston")),
    (r"\b(chicago)\b", ("US", "Chicago")),
    (r"\b(los\s*angeles)\b", ("US", "Los Angeles")),
    (r"\b(toronto)\b", ("CA", "Toronto")),
    (r"\b(vancouver)\b", ("CA", "Vancouver")),
    (r"\b(usa|united\s*states|сша)\b", ("US", "New York")),
]
