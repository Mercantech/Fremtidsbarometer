from database.models import Era
from sqlalchemy.dialects.postgresql import insert

ERAS_SEED = [
    {
        "year": 1964,
        "title": "Mainframe & Punch Cards",
        "subtitle": "IBM System/360, COBOL & Apollo Guidance Computer",
        "stats": {
            "title_da": "Hovedrammer & Hulkort",
            "subtitle_da": "IBM System/360, COBOL & Apollo-navigationscomputer",
            "tagline": "The dawn of enterprise computing, magnetic reel storage, and modular architecture.",
            "tagline_da": "Begyndelsen på virksomheds-IT, magnetbånd og modulær computerarkitektur.",
            "icon": "📼",
            "moodColor": "#e6a23c",
            "roles": [
                ["Mainframe Operator", "CORE", "Mounted magnetic tapes, loaded punched cards, monitored room-sized IBM mainframes.", "Monterede magnetbånd, indlæste hulkort og overvågede rumsstore IBM-computere."],
                ["COBOL Programmer", "ENTERPRISE", "Wrote business logic for banking ledgers and insurance transaction processing.", "Skrev forretningslogik til bankbøger og forsikringstransaktioner."],
                ["Fortran Scientist", "RESEARCH", "Implemented numerical simulations for aerospace, nuclear physics, and NASA.", "Udviklede numeriske simuleringer til rumfart, atomfysik og NASA."],
                ["Keypunch Operator", "DATA ENTRY", "Transcribed paper vouchers into 80-column Hollerith punched cards.", "Overførte manuelle papirbilag til 80-kolonne hulkort."],
                ["Systems Engineer", "CRITICAL", "Maintained core memory magnetic rings and early germanium transistor modules.", "Vedligeholdt ferritkerneminne og tidlige germaniumtransistor-moduler."]
            ],
            "stack": [
                ["COBOL", "BUSINESS", "Common Business-Oriented Language, powering world banking ledgers to this day.", "Standard forretningssprog, der stadig driver globale banktransaktioner."],
                ["FORTRAN IV", "SCIENCE", "Formula Translation language for high-performance mathematical and physics calculus.", "Formeloversættelsessprog til videnskabelige og tekniske beregninger."],
                ["IBM System/360", "HARDWARE", "First unified computer family sharing the same instruction set across models.", "Første computere med kompatibel instruktionsarkitektur på tværs af modeller."],
                ["Punched Cards", "MEDIA", "Standard 80-column rectangular paper cards used for code and input batch data.", "80-kolonne papirkort anvendt til programkode og batch-dataindtastning."],
                ["Magnetic Tape", "STORAGE", "9-track open magnetic reel drives providing sequential persistent storage.", "9-spors magnetbåndsstationer til sekventiel permanent datalagring."],
                ["LISP", "AI PIONEER", "John McCarthy's symbolic language, founding mathematical artificial intelligence.", "John McCarthys symbolske sprog, der grundlagde kunstig intelligens."]
            ],
            "hypeTopic": "Modular Mainframes & Space Race",
            "hypeTopic_da": "Modulære Hovedrammer & Rumkapløbet",
            "hypeDesc": "IBM invests a record $5 billion into System/360, while Margaret Hamilton's software team writes code landing Apollo 11 on the Moon.",
            "hypeDesc_da": "IBM satser historiske $5 milliarder på System/360, mens Margaret Hamiltons softwareteam skriver koden, der lander Apollo 11 på Månen.",
            "milestones": [
                {"year": 1964, "title": "IBM System/360 Architecture", "title_da": "IBM System/360 Arkitektur", "desc": "Decoupled hardware from software via unified instruction architecture.", "desc_da": "Adskilte hardware fra software via universel instruktionsarkitektur."},
                {"year": 1968, "title": "The Mother of All Demos", "title_da": "Moderen til Alle Demoer", "desc": "Doug Engelbart debuts the computer mouse, windows, hypertext, and collaboration.", "desc_da": "Doug Engelbart demonstrerer computermusen, vinduer, hypertekst og samarbejde."},
                {"year": 1969, "title": "Apollo 11 Lunar Landing", "title_da": "Apollo 11 Månelanding", "desc": "Asynchronous priority executive software safely handles radar sensor overload.", "desc_da": "Asynkron prioritetsstyret software håndterer sensoroverbelastning under landing."}
            ],
            "chronicle": [
                {"year": 1964, "headline": "IBM announces System/360 computer family", "headline_da": "IBM lancerer System/360 modulære computere", "snippet": "A daring $5B initiative introducing bytes, 32-bit words, and modular upgrades.", "snippet_da": "En historisk satsning på $5 mia., der introducerer bytes og modulære opgraderinger.", "tag": "HARDWARE"},
                {"year": 1965, "headline": "Gordon Moore publishes transistor scaling observation", "headline_da": "Gordon Moore formulerer Moores Lov", "snippet": "Predicts circuit density will double every two years, establishing semiconductor roadmap.", "snippet_da": "Forudsiger fordobling af transistorer hvert andet år og sætter kursen for microchips.", "tag": "CHIPS"},
                {"year": 1968, "headline": "Doug Engelbart demonstrates the interactive mouse", "headline_da": "Doug Engelbart fremviser den interaktive mus", "snippet": "Live 90-minute demo showcases collaborative real-time text editing and hypertext.", "snippet_da": "Live-demonstration viser samarbejdsredigering, vinduer og hypertekst for første gang.", "tag": "INNOVATION"},
                {"year": 1969, "headline": "Margaret Hamilton's Apollo AGC guides moon touchdown", "headline_da": "Margaret Hamiltons Apollo-software sikrer månelanding", "snippet": "Software priority scheduling prevents crash when radar buffers overflow during descent.", "snippet_da": "Prioritetsstyret software forhindrer systemcrash under månelandingen.", "tag": "SPACE"}
            ]
        }
    },
    {
        "year": 1972,
        "title": "UNIX & ARPANET Dawn",
        "subtitle": "Bell Labs C Language, packet switching & microprocessors",
        "stats": {
            "title_da": "UNIX & ARPANET Begyndelse",
            "subtitle_da": "Bell Labs C-sproget, pakkeskift & mikroprocessorer",
            "tagline": "Dennis Ritchie invents C, Ken Thompson writes UNIX, and the first network packets cross ARPANET.",
            "tagline_da": "Dennis Ritchie opfinder C, Ken Thompson skriver UNIX, og de første netværkspakker krydser ARPANET.",
            "icon": "📟",
            "moodColor": "#00d4aa",
            "roles": [
                ["UNIX Systems Programmer", "CORE", "Wrote low-level utilities and device drivers in C for PDP-11 minicomputers.", "Skrev systemværktøjer og drivere i C til PDP-11 minicomputere."],
                ["Network Engineer", "EMERGING", "Configured ARPANET Interface Message Processors (IMPs) and packet routing.", "Konfigurerede tidlige ARPANET-pakkeforbindelser og routingprotokoller."],
                ["Assembly / Microcode Dev", "HIGH", "Programmed microcode instructions for first 4-bit and 8-bit microprocessors.", "Programmerede mikrokode til de første 4-bit og 8-bit mikroprocessorer."],
                ["Database Researcher", "NEW ROLE", "Explored Edgar F. Codd's relational algebra and early relational data stores.", "Udforskede Edgar F. Codds relationelle datamodel og tidlige databaser."],
                ["Telecommunications Tech", "GROWING", "Wired dedicated acoustic-coupler phone modems and teletype machines.", "Forbandt akustiske telefonmodemer og fjernskrivere (TTY-terminaler)."]
            ],
            "stack": [
                ["C", "SYSTEMS", "Dennis Ritchie's typed language combining high-level syntax with raw memory speed.", "Dennis Ritchies banebrydende sprog, der kombinerede bærbarhed med hardwarehastighed."],
                ["UNIX", "OS", "Multitasking, multi-user operating system built on clean pipes and file abstractions.", "Multitasking-styresystem bygget på elegante pipes og filabstraktioner."],
                ["PDP-11", "MINICOMPUTER", "DEC's accessible 16-bit minicomputer powering universities and laboratories.", "DECs 16-bit minicomputer, der demokratiserede adgang til computerkraft."],
                ["ARPANET", "NETWORKING", "First operational packet-switching network connecting UCLA, Stanford, and Utah.", "Første pakkeskiftende datanetværk, der forbandt forskningsinstitutioner."],
                ["Intel 8008 / 4004", "CHIP", "Birth of the commercial microprocessor, moving CPU onto a single silicon chip.", "De første kommercielle mikroprocessorer på en enkelt siliciumchip."],
                ["Pascal", "STRUCTURED", "Niklaus Wirth's teaching language enforcing structured programming principles.", "Niklaus Wirths sprog til struktureret programmering og compiler-design."]
            ],
            "hypeTopic": "Microprocessors & Packet Networks",
            "hypeTopic_da": "Mikroprocessorer & Pakkenetværk",
            "hypeDesc": "Single-chip microprocessors make computing compact, while ARPANET proves that distributed packet-switched communication can survive node outages.",
            "hypeDesc_da": "Mikroprocessorer gør computere kompakte, mens ARPANET beviser, at distribueret pakkeskift fungerer.",
            "milestones": [
                {"year": 1969, "title": "First ARPANET Transmission", "title_da": "Første ARPANET-transmission", "desc": "Message 'LO' sent from UCLA to Stanford SRI before the system buffer faulted.", "desc_da": "Beskeden 'LO' sendt fra UCLA til Stanford før systembufferen overfyldtes."},
                {"year": 1971, "title": "Intel 4004 Released", "title_da": "Intel 4004 Lanceret", "desc": "First commercially produced single-chip central processing unit.", "desc_da": "Første kommercielt fremstillede CPU på en enkelt chip."},
                {"year": 1972, "title": "The C Language Created", "title_da": "C-sproget Skabes", "desc": "Dennis Ritchie at Bell Labs enables portable operating systems.", "desc_da": "Dennis Ritchie hos Bell Labs muliggør flytbare styresystemer."}
            ],
            "chronicle": [
                {"year": 1969, "headline": "ARPANET connects first host computers", "headline_da": "ARPANET forbinder de første værtscomputere", "snippet": "Leonard Kleinrock's team sends the first networked packet between universities.", "snippet_da": "De første netværkspakker sendes med succes mellem amerikanske universiteter.", "tag": "NETWORK"},
                {"year": 1971, "headline": "Intel introduces the 4004 4-bit microprocessor", "headline_da": "Intel lancerer 4004 4-bit mikroprocessoren", "snippet": "Federico Faggin and Ted Hoff fit 2,300 transistors on a microchip.", "snippet_da": "2.300 transistorer samles på en mikrochip og starter pc-æraen.", "tag": "HARDWARE"},
                {"year": 1972, "headline": "Dennis Ritchie creates the C programming language", "headline_da": "Dennis Ritchie opfinder programmeringssproget C", "snippet": "Allows UNIX to be rewritten for total portability across different hardware architectures.", "snippet_da": "Gør UNIX flytbart til enhver hardwarearkitektur og sætter standarden for systemsoftware.", "tag": "SOFTWARE"},
                {"year": 1973, "headline": "Ethernet protocol invented at Xerox PARC", "headline_da": "Ethernet-protokollen opfindes hos Xerox PARC", "snippet": "Robert Metcalfe designs CSMA/CD local area networking over coaxial cable.", "snippet_da": "Robert Metcalfe designer lokalnetværk (LAN) over koaksialkabel.", "tag": "NETWORK"}
            ]
        }
    },
    {
        "year": 1981,
        "title": "PC Revolution & GUI",
        "subtitle": "IBM PC 5150, Apple Macintosh, MS-DOS & SQL foundations",
        "stats": {
            "title_da": "PC-revolution & Grafisk Brugerflade",
            "subtitle_da": "IBM PC 5150, Apple Macintosh, MS-DOS & SQL-fundament",
            "tagline": "Personal computers arrive on every desk, Apple demos Macintosh GUI, and relational databases conquer business.",
            "tagline_da": "Personlige computere rykker ind på skriveborde, Apple lancerer Macintosh GUI, og SQL-databaser erobrer erhvervslivet.",
            "icon": "💾",
            "moodColor": "#4facfe",
            "roles": [
                ["PC Software Developer", "BOOMING", "Built desktop productivity tools in C, Turbo Pascal, and x86 Assembly.", "Udviklede kontorsoftware og regneark i C, Turbo Pascal og x86 assembler."],
                ["Database Administrator (SQL)", "ENTERPRISE", "Designed relational schemas and wrote SQL queries on Oracle and DB2.", "Designede relationelle skemaer og skrev SQL-forespørgsler i Oracle og DB2."],
                ["Desktop Support Tech", "NEW ROLE", "Installed internal hard drives, floppy controllers, and serial dot-matrix printers.", "Installerede harddiske, diskette-drev og serielle matrixprintere."],
                ["GUI / UX Pioneer", "CREATIVE", "Engineered windowing widgets, mouse cursor hit-testing, and bitmap icons.", "Udviklede vindueskomponenter, musemarkører og bitmap-ikoner."],
                ["Embedded Engineer", "GROWING", "Wrote BIOS routines and real-time firmware for peripheral expansion cards.", "Skrev BIOS-rutiner og firmware til udvidelseskort og controllere."]
            ],
            "stack": [
                ["C / C++", "CORE", "Bjarne Stroustrup adds classes to C, setting the standard for desktop software.", "Bjarne Stroustrup tilføjer klasser til C og skaber fundamentet for moderne systemer."],
                ["MS-DOS / PC DOS", "OS", "Command-line disk operating system licensed by Microsoft for IBM PCs.", "Kommandolinje-styresystem leveret af Microsoft til IBM PC-computere."],
                ["IBM PC 5150", "HARDWARE", "The open-architecture computer that legitimized personal computers for business.", "Den åbne computerarkitektur, der gjorde pc'en til en forretningsstandard."],
                ["SQL / Oracle", "DATA", "Structured Query Language standardizing relational data manipulation.", "Standardiseret forespørgselssprog til relationelle databaser."],
                ["Turbo Pascal", "DEV TOOLS", "Anders Hejlsberg's lightning-fast single-pass IDE and compiler.", "Anders Hejlsbergs lynhurtige integrerede udviklingsmiljø og compiler."],
                ["3.5-inch Floppy", "STORAGE", "Sony rigid plastic magnetic microfloppy holding 720KB to 1.44MB.", "Magnetisk diskette i hård plast til transport af programmer og data."]
            ],
            "hypeTopic": "Personal Computer in Every Home",
            "hypeTopic_da": "En Personlig Computer i Hvert Hjem",
            "hypeDesc": "IBM validates the microcomputer market while Steve Jobs introduces Apple Macintosh with a stunning 1984 Super Bowl commercial.",
            "hypeDesc_da": "IBM legitimerer pc-markedet, mens Steve Jobs lancerer Apple Macintosh med den ikoniske 1984-reklame.",
            "milestones": [
                {"year": 1981, "title": "IBM PC 5150 Launched", "title_da": "IBM PC 5150 Lanceret", "desc": "Intel 8088 CPU, 16KB RAM, and open architecture create the PC-compatible clone boom.", "desc_da": "Intel 8088-processor og åben arkitektur skaber bølgen af pc-kloner."},
                {"year": 1984, "title": "Apple Macintosh Debut", "title_da": "Apple Macintosh Debut", "desc": "Brought graphical user interface, windows, and mouse navigation to the consumer masses.", "desc_da": "Udbredte grafisk brugerflade, vinduer og musen til den brede befolkning."},
                {"year": 1985, "title": "Bjarne Stroustrup Releases C++", "title_da": "C++ Frigives af Bjarne Stroustrup", "desc": "Object-oriented programming language with zero-overhead abstractions.", "desc_da": "Objektorienteret sprog med nul-abstraktionsomkostning for maksimal ydelse."}
            ],
            "chronicle": [
                {"year": 1981, "headline": "IBM unveils 5150 PC powered by Microsoft DOS", "headline_da": "IBM lancerer 5150 PC med Microsoft DOS", "snippet": "Priced at $1,565, legitimized small computers for corporations worldwide.", "snippet_da": "Prissat til $1.565, gjorde små computere uundværlige for erhvervslivet.", "tag": "PC"},
                {"year": 1982, "headline": "Time Magazine names The Computer 'Machine of the Year'", "headline_da": "Time Magazine kårer Computeren til 'Machine of the Year'", "snippet": "Breaks decades of tradition by substituting a machine for Person of the Year.", "snippet_da": "Bryder årtiers tradition ved at udnævne en maskine i stedet for en person.", "tag": "CULTURE"},
                {"year": 1984, "headline": "Apple airs '1984' ad and ships Macintosh with graphical mouse", "headline_da": "Apple viser '1984' og sender Macintosh med mus på gaden", "snippet": "Revolutionizes user interfaces, banishing command lines for visual desktop icons.", "snippet_da": "Revolutionerer brugerfladen ved at erstatte kommandolinjen med ikoner og mus.", "tag": "APPLE"},
                {"year": 1985, "headline": "Danish computer scientist Bjarne Stroustrup publishes 'The C++ Programming Language'", "headline_da": "Danske Bjarne Stroustrup udgiver 'The C++ Programming Language'", "snippet": "Expands C with object-oriented paradigms, classes, and strong type safety.", "snippet_da": "Udvider C med objektorienterede paradigmer, klasser og stærk typesikkerhed.", "tag": "LANGUAGE"}
            ]
        }
    },
    {
        "year": 1995,
        "title": "Web 1.0 & Dot-Com Boom",
        "subtitle": "Commercial web boom, Netscape IPO & dynamic CGI scripts",
        "stats": {
            "title_da": "Web 1.0 & Dot-Com Bølge",
            "subtitle_da": "Kommerciel internetbølge, Netscape IPO & CGI-scripts",
            "tagline": "The World Wide Web connects humanity. Dot-com IPOs reshape global financial markets.",
            "tagline_da": "World Wide Web forbinder menneskeheden. Dot-com-børsnoteringer forandrer den globale økonomi.",
            "icon": "🌐",
            "moodColor": "#ff8c00",
            "roles": [
                ["Webmaster", "HIGH", "Managed the entire website from Apache server setup to HTML markup.", "Styrede hele hjemmesiden fra Apache-serverkonfiguration til HTML-kodning."],
                ["Sysadmin", "$50k/YR", "Maintained Unix servers, local networks, and dial-up connectivity.", "Vedligeholdt Unix-servere, lokale netværk og modemopkobling."],
                ["C++ / Delphi Dev", "CORE", "Built high-performance desktop applications and enterprise backends.", "Byggede hurtige desktop-applikationer og virksomhedssystemer."],
                ["DBA (Oracle)", "ENTERPRISE", "Specialist in managing complex enterprise relational database clusters.", "Specialist i styring af komplekse Oracle-databaser."],
                ["Network Engineer", "GROWING", "Configured Cisco routers and T1/ISDN telecommunication backbones.", "Konfigurerede Cisco-routere og ISDN/T1-telekommunikationslinjer."],
                ["QA Tester", "NEW ROLE", "Manually tested software releases across Windows 95 and NT versions.", "Testede softwareudgivelser manuelt på Windows 95 og NT."]
            ],
            "stack": [
                ["HTML / CGI", "WEB", "Hypertext markup and Common Gateway Interface Perl scripts.", "Hypertekst-opmærkning og Perl-scripts til dynamiske websider."],
                ["Perl", "BACKEND", "The 'duct tape of the internet', parsing text and executing CGI scripts.", "Internettets 'gaffatape', brugt til tekstbehandling og server-scripts."],
                ["Java", "CROSS-PLATFORM", "Sun Microsystems' 'Write Once, Run Anywhere' object-oriented platform.", "Sun Microsystems' platform til platforms-uafhængig kode."],
                ["JavaScript", "FRONTEND", "Brendan Eich's 10-day language for lightweight browser interactivity.", "Brendan Eichs browser-sprog skabt på 10 dage til klientside-logik."],
                ["Oracle / MySQL", "DATA", "Dominant commercial enterprise and emerging open-source databases.", "Førende kommercielle og spirende open source-databaser."],
                ["Windows 95", "OS", "Microsoft's consumer operating system introducing the Start menu and 32-bit API.", "Microsofts forbruger-OS med Start-menuen og 32-bit arkitektur."]
            ],
            "hypeTopic": "Dot-Com Gold Rush",
            "hypeTopic_da": "Dot-Com Guldfeberen",
            "hypeDesc": "Creation of the first commercial websites. Netscape IPO sparks unprecedented venture capital and browser wars.",
            "hypeDesc_da": "Fremkomsten af de første kommercielle websites. Netscapes børsnotering udløser historiske tech-investeringer.",
            "milestones": [
                {"year": 1991, "title": "World Wide Web Publicly Available", "title_da": "World Wide Web Åbnes", "desc": "Tim Berners-Lee at CERN releases WWW code into public domain.", "desc_da": "Tim Berners-Lee hos CERN frigiver WWW-koden til offentligheden."},
                {"year": 1995, "title": "Netscape IPO & JavaScript Created", "title_da": "Netscape IPO & JavaScript Skabes", "desc": "Commercial browser sparks the dot-com era; JavaScript debuts in Netscape Navigator.", "desc_da": "Kommerciel browser starter internetæraen; JavaScript debuterer i Netscape."},
                {"year": 1995, "title": "Java Released by Sun", "title_da": "Java Lanceret af Sun", "desc": "Enterprise object-oriented computing arrives with bytecode virtual machines.", "desc_da": "Objektorienteret enterprise-software vinder frem med Java Virtual Machine."}
            ],
            "chronicle": [
                {"year": 1991, "headline": "Tim Berners-Lee announces the World Wide Web on Usenet", "headline_da": "Tim Berners-Lee annoncerer World Wide Web", "snippet": "CERN researcher invites collaborators to build hypermedia information mesh.", "snippet_da": "CERN-forsker inviterer verden til at bygge et åbent hypermedienetværk.", "tag": "WEB"},
                {"year": 1995, "headline": "Netscape IPO sparks the dot-com financial boom", "headline_da": "Netscape børsnoteres og starter dot-com-bølgen", "snippet": "Shares skyrocket from $28 to $75 on first trading day, signaling Internet age.", "snippet_da": "Aktiekursen eksploderer og markerer starten på den kommercielle internetalder.", "tag": "FINANCE"},
                {"year": 1995, "headline": "Microsoft releases Windows 95 with built-in Internet support", "headline_da": "Microsoft lancerer Windows 95 med internetunderstøttelse", "snippet": "Sells 1 million copies in first 4 days with historic Empire State Building lighting.", "snippet_da": "Sælger over en million eksemplarer på fire dage med Start-menuen.", "tag": "OS"},
                {"year": 1998, "headline": "Larry Page and Sergey Brin incorporate Google", "headline_da": "Larry Page og Sergey Brin stifter Google", "snippet": "PageRank algorithm transforms search by weighting link graph topology.", "snippet_da": "PageRank-algoritmen revolutionerer internetsøgning ved hjælp af linkgrafer.", "tag": "SEARCH"}
            ]
        }
    },
    {
        "year": 2008,
        "title": "Mobile & Cloud Revolution",
        "subtitle": "App Store launch, AWS standardization & smartphone dominance",
        "stats": {
            "title_da": "Mobil & Sky Revolution",
            "subtitle_da": "App Store-lancering, AWS-standardisering & smartphones",
            "tagline": "Smartphones put supercomputers into pockets while Amazon Web Services democratizes infrastructure.",
            "tagline_da": "Smartphones lægger supercomputere i lommen, mens Amazon Web Services gør skalerbar infrastruktur tilgængelig for alle.",
            "icon": "📱",
            "moodColor": "#00d4ff",
            "roles": [
                ["iOS / Android Dev", "HOT", "Built native mobile touch applications for booming smartphone stores.", "Byggede native mobilapps til iPhone og Android med berøringsflader."],
                ["Fullstack Engineer", "$90k/YR", "Handled both frontend JavaScript interfaces and backend REST APIs.", "Udviklede både frontend-brugerflader og backend REST-API'er."],
                ["Cloud Architect", "EMERGING", "Designed auto-scaling infrastructure on Amazon Web Services (EC2, S3).", "Designede automatisk skalerbar infrastruktur på AWS-skyen."],
                ["Scrum Master", "TREND", "Facilitated two-week Agile sprint cycles and standups within teams.", "Faciliterede agile to-ugers sprint-cyklusser og daglige standups."],
                ["UX / UI Designer", "GROWING", "Focused on mobile ergonomics, fluid gestures, and responsive interfaces.", "Fokuserede på mobil brugervenlighed og flydende gestus-design."],
                ["QA Automation", "STANDARD", "Wrote Selenium scripts to automate end-to-end browser testing.", "Skrev automatiserede testscripts til regressionstest i browsere."]
            ],
            "stack": [
                ["Objective-C / Java", "MOBILE", "Primary native languages for iOS Cocoa Touch and Android Dalvik runtimes.", "Sprog til udvikling af native apps til iOS og Android."],
                ["Ruby on Rails", "STARTUPS", "Opinionated framework for ultra-rapid web application development.", "Populært framework til hurtig udvikling af webapplikationer."],
                ["AWS EC2 / S3", "CLOUD", "Foundational cloud computing and object storage services eliminating owned servers.", "Elastisk serverkraft og lagerplads, der eliminerede behovet for egne serverrum."],
                ["jQuery", "FRONTEND", "Simplified JavaScript DOM traversal, event handling, and Ajax requests.", "Gjorde JavaScript DOM-manipulation og Ajax-anmodninger simple på tværs af browsere."],
                ["Git / GitHub", "VCS", "Distributed version control system created by Linus Torvalds, transforming teamwork.", "Distribueret versionsstyringssystem, der transformerede samarbejde om open source."],
                ["Python / Django", "BACKEND", "Batteries-included web framework for robust, secure web applications.", "Robust backend-framework til sikre webapplikationer."]
            ],
            "hypeTopic": "The App Economy & Cloud Infrastructure",
            "hypeTopic_da": "App-økonomien & Skyinfrastruktur",
            "hypeDesc": "Apple launches the App Store, generating billions for indie developers, while AWS proves startups can scale globally with zero hardware purchase.",
            "hypeDesc_da": "Apple åbner App Store og skaber app-økonomien, mens AWS beviser, at nystartede virksomheder kan skalere globalt uden egne servere.",
            "milestones": [
                {"year": 2007, "title": "iPhone Unveiled by Steve Jobs", "title_da": "iPhone Præsenteres af Steve Jobs", "desc": "Multi-touch glass display renders physical keypads obsolete.", "desc_da": "Multi-touch glasskærm gør fysiske telefontastaturer forældede."},
                {"year": 2008, "title": "App Store & Android Launch", "title_da": "App Store & Android Lanceret", "desc": "Creation of the mobile software marketplace ecosystem.", "desc_da": "Fødslen af det globale markedsplads-økosystem for mobilsoftware."},
                {"year": 2008, "title": "Satoshi Nakamoto Publishes Bitcoin Paper", "title_da": "Satoshi Nakamoto Udgiver Bitcoin Whitepaper", "desc": "Peer-to-peer electronic cash system introduces distributed cryptographic consensus.", "desc_da": "Peer-to-peer elektronisk pengesystem introducerer blockchain-konsensus."}
            ],
            "chronicle": [
                {"year": 2007, "headline": "Apple announces iPhone with multi-touch capacitive display", "headline_da": "Apple lancerer iPhone med multi-touch skærm", "snippet": "Steve Jobs reveals three devices in one: iPod, phone, and internet communicator.", "snippet_da": "Steve Jobs præsenterer en iPod, telefon og internet-enhed i ét samlet apparat.", "tag": "MOBILE"},
                {"year": 2008, "headline": "Apple opens the App Store with 500 initial applications", "headline_da": "Apple åbner App Store med 500 apps", "snippet": "Surpasses 10 million downloads in the very first weekend.", "snippet_da": "Passerer 10 millioner app-downloads i den allerførste åbningsweekend.", "tag": "SOFTWARE"},
                {"year": 2008, "headline": "Google announces open-source Chrome browser and V8 JavaScript engine", "headline_da": "Google lancerer Chrome og V8-motoren", "snippet": "V8 JIT compilation speeds up JavaScript performance by 10x, enabling web applications.", "snippet_da": "V8 just-in-time compilering accelererer webkode med en faktor 10.", "tag": "WEB"},
                {"year": 2009, "headline": "Ryan Dahl introduces Node.js at JSConf EU", "headline_da": "Ryan Dahl introducerer Node.js", "snippet": "Event-driven asynchronous I/O brings JavaScript from the browser to the backend server.", "snippet_da": "Asynkron hændelsesstyring bringer JavaScript over på serveren.", "tag": "BACKEND"}
            ]
        }
    },
    {
        "year": 2018,
        "title": "Cloud Native & Microservices",
        "subtitle": "Kubernetes orchestration, Docker, Go, Python data science",
        "stats": {
            "title_da": "Skybaseret & Mikrotjenester",
            "subtitle_da": "Kubernetes-orkestrering, Docker, Go & Python-datavidenskab",
            "tagline": "Monoliths give way to distributed Kubernetes clusters and predictive machine learning models.",
            "tagline_da": "Monolitter erstattes af distribuerede Kubernetes-klynger og maskinlæringsmodeller.",
            "icon": "☁️",
            "moodColor": "#a855f7",
            "roles": [
                ["DevOps / SRE Engineer", "CRITICAL", "Maintained CI/CD pipelines, Kubernetes clusters, and 99.99% uptime SLOs.", "Vedligeholdt CI/CD-pipelines, Kubernetes-klynger og høj driftssikkerhed."],
                ["Data Scientist / ML Eng.", "$140k/YR", "Trained neural networks and built predictive feature pipelines in Python.", "Trænede neurale netværk og byggede data pipelines i Python."],
                ["Frontend (React / Vue)", "HIGH", "Constructed reactive state-driven single-page web applications.", "Udviklede reaktive single-page webapplikationer i React og TypeScript."],
                ["Backend (Go / Microservices)", "CORE", "Built lightweight, highly concurrent microservices communicating via gRPC.", "Byggede lynhurtige mikrotjenester med høj samtidighed i Go og gRPC."],
                ["Cloud Platform Engineer", "RISING", "Created internal developer platforms and infrastructure as code templates.", "Udviklede interne udviklerplatforme og infrastrukturskabeloner."],
                ["Product Manager", "STANDARD", "Prioritized team roadmaps based on analytics, user funnel metrics, and A/B tests.", "Prioriterede produkt-roadmaps baseret på analyser og A/B-tests."]
            ],
            "stack": [
                ["Kubernetes / Docker", "ORCHESTRATION", "Container runtime packaging and declarative cluster management.", "Kontejnerisering og deklarativ orkestrering af distribuerede klynger."],
                ["Go", "SYSTEMS", "Google's concurrent language powering modern cloud infrastructure.", "Googles samtidige sprog, der driver fundamentet for moderne skysoftware."],
                ["Python", "DATA & ML", "Dominant language for TensorFlow, PyTorch, pandas, and scientific computing.", "Førende sprog til maskinlæring, PyTorch, dataanalyse og automatisering."],
                ["React / TypeScript", "FRONTEND", "Component-driven declarative user interfaces backed by static typing.", "Komponentbaserede brugerflader med typesikker TypeScript."],
                ["Kafka / gRPC", "MESSAGING", "High-throughput distributed event streaming and binary protocol buffers.", "Distribueret hændelses-streaming og højtydende binære RPC-protokoller."],
                ["Terraform", "IaC", "HashiCorp's declarative tool for infrastructure as code across cloud providers.", "Deklarativ håndtering af cloud-infrastruktur som kode."]
            ],
            "hypeTopic": "Microservice Decoupling & Deep Learning",
            "hypeTopic_da": "Mikrotjenester & Dyb Læring",
            "hypeDesc": "Enterprises break giant legacy monoliths into hundreds of containers, while AlexNet and Transformers spark the deep learning gold rush.",
            "hypeDesc_da": "Virksomheder opdeler monolitter i hundreder af containere, mens Transformer-modeller starter deep learning-bølgen.",
            "milestones": [
                {"year": 2014, "title": "Google Donates Kubernetes to CNCF", "title_da": "Google Donerer Kubernetes til CNCF", "desc": "Borg-inspired container orchestration becomes the de facto standard.", "desc_da": "Borg-inspireret container-orkestrering bliver den globale industristandard."},
                {"year": 2017, "title": "Google Publishes 'Attention Is All You Need'", "title_da": "Transformer-arkitekturen Opfindes", "desc": "Introduces the Transformer neural network architecture that powers modern LLMs.", "desc_da": "Transformer-arkitekturen opfindes og danner fundamentet for moderne sprogmodeller."},
                {"year": 2018, "title": "GitHub Acquired by Microsoft for $7.5B", "title_da": "Microsoft Opkøber GitHub", "desc": "Solidifies open source as the cornerstone of enterprise software development.", "desc_da": "Befæster open source som hjørnestenen i enterprise softwareudvikling."}
            ],
            "chronicle": [
                {"year": 2015, "headline": "Cloud Native Computing Foundation (CNCF) formed", "headline_da": "CNCF stiftes til styring af skyteknologi", "snippet": "Linux Foundation partners with tech leaders to standardize vendor-neutral cloud computing.", "snippet_da": "Teknologiledere samles for at standardisere leverandøruafhængig skyteknologi.", "tag": "CLOUD"},
                {"year": 2016, "headline": "DeepMind's AlphaGo defeats world Go champion Lee Sedol", "headline_da": "DeepMinds AlphaGo besejrer verdensmesteren i Go", "snippet": "Historic 4-1 victory proves deep reinforcement learning can master complex intuition.", "snippet_da": "Historisk sejr beviser, at forstærkningslæring kan mestre kompleks menneskelig intuition.", "tag": "AI"},
                {"year": 2017, "headline": "Google researchers introduce Transformer architecture", "headline_da": "Googles forskere introducerer Transformer-modellen", "snippet": "Self-attention mechanism radically accelerates NLP training performance.", "snippet_da": "Opmærksomhedsmekanismer gør træning af sprogmodeller dramatisk mere effektiv.", "tag": "AI"},
                {"year": 2018, "headline": "EU enacts General Data Protection Regulation (GDPR)", "headline_da": "EU indfører GDPR-databeskyttelse", "snippet": "Sweeping privacy law reshapes how software systems store and process user telemetry.", "snippet_da": "Omfattende privatlivslovgivning ændrer måden hvorpå data gemmes og behandles.", "tag": "REGULATION"}
            ]
        }
    },
    {
        "year": 2026,
        "title": "AI Agents & System Logic",
        "subtitle": "Autonomous LLMs, agentic workflows, Rust & multimodal AI",
        "stats": {
            "title_da": "AI-Agenter & Systemlogik",
            "subtitle_da": "Autonome LLM-modeller, agent-arbejdsgange, Rust & multimodal AI",
            "tagline": "Autonomous agents orchestrate architecture, self-heal distributed services, and refactor codebases.",
            "tagline_da": "Autonome agenter orkestrerer arkitektur, selvreparerer distribuerede tjenester og refaktorerer kodebaser.",
            "icon": "🤖",
            "moodColor": "#ff2a85",
            "roles": [
                ["AI Systems Architect", "$160k/YR", "Designs multi-agent orchestrations, MCP tool pipelines, and deterministic evals.", "Designer multi-agent orkestreringer, MCP-værktøjspipelines og deterministiske evalueringer."],
                ["Rust Systems Engineer", "HIGH DEMAND", "Builds ultra-fast, memory-safe inference kernels and concurrent distributed runtimes.", "Bygger lynhurtige, hukommelsessikre inferens-kerner og distribuerede runtimes."],
                ["Agentic Workflow Eng.", "HOT", "Programs autonomous coding subagents, reflection loops, and tool integrations.", "Programmerer autonome kodningsagenter, refleksionsløkker og værktøjsintegrationer."],
                ["MLOps & Fine-Tuning Lead", "CRITICAL", "Manages model weights, LoRA adapters, private vector databases, and inference serving.", "Styrer modelvægte, LoRA-adaptere, private vektordatabaser og inferens-servere."],
                ["AI Security / Red Teamer", "RISING", "Protects systems against prompt injection, jailbreaks, and autonomous privilege escalation.", "Sikrer systemer mod prompt injection, jailbreaks og uautoriseret adgang fra agenter."],
                ["Fullstack (TS / Next.js)", "CORE", "Builds real-time streaming interfaces and spatial visualizations for AI reasoning.", "Udvikler realtids streaming-brugerflader og rumlige visualiseringer til AI-ræsonnement."]
            ],
            "stack": [
                ["Python / PyTorch", "AI CORE", "The lingua franca of neural architectures, training, and open model evaluation.", "Hovedsproget til neurale netværk, træning og evaluering af åbne modeller."],
                ["Rust", "PERFORMANCE", "Zero-cost abstractions and memory safety for high-throughput inference backends.", "Hukommelsessikkert sprog til højtydende AI-inferens og systemkomponenter."],
                ["TypeScript", "ECOSYSTEM", "Strict typing standard for AI agent orchestrators, MCP servers, and modern web apps.", "Typesikker standard til agent-orkestrering, MCP-servere og webapplikationer."],
                ["Model Context Protocol (MCP)", "PROTOCOL", "Anthropic & open industry standard connecting LLMs to tools and data sources.", "Åben industristandard til sikker kobling mellem sprogmodeller og eksterne værktøjer."],
                ["Vector DBs & RAG", "SEARCH", "Milvus, pgvector, and Pinecone enabling high-dimensional semantic retrieval.", "pgvector og vektordatabaser til semantisk søgning og vidensforankring."],
                ["Agentic Frameworks", "AGENTS", "Autonomous reasoning frameworks handling memory, scratchpads, and execution steps.", "Autonome frameworks til planlægning, arbejdshukommelse og værktøjskald."]
            ],
            "hypeTopic": "Agentic Reasoning & System Logic",
            "hypeTopic_da": "Agent-ræsonnement & Systemlogik",
            "hypeDesc": "Transition from passive chat completion to active autonomous agents executing shell commands, writing unit tests, and committing code.",
            "hypeDesc_da": "Skiftet fra passive chatbots til aktive autonome agenter, der kører shell-kommandoer, skriver tests og committer kode.",
            "milestones": [
                {"year": 2023, "title": "Generative AI Boom", "title_da": "Generativ AI-bølge", "desc": "ChatGPT and open models achieve mainstream global adoption.", "desc_da": "ChatGPT og åbne modeller opnår bred global udbredelse."},
                {"year": 2024, "title": "Reasoning Models & Test-Time Compute", "title_da": "Ræsonnerende Modeller", "desc": "Models utilize Chain-of-Thought search to solve PhD-level science and coding tasks.", "desc_da": "Modeller bruger tænketid (Chain-of-Thought) til at løse komplekse kodeopgaver."},
                {"year": 2026, "title": "Autonomous Multi-Agent Swarms", "title_da": "Autonome Multi-Agent Sværme", "desc": "Software engineering shifts to orchestrating fleets of autonomous specialist agents.", "desc_da": "Softwareudvikling skifter mod orkestrering af specialiserede AI-agenter."}
            ],
            "chronicle": [
                {"year": 2024, "headline": "Anthropic releases Model Context Protocol (MCP) as open standard", "headline_da": "Anthropic frigiver Model Context Protocol (MCP)", "snippet": "Standardizes bi-directional protocol for AI assistants to safely query enterprise databases and systems.", "snippet_da": "Standardiserer sikker to-vejs protokol for AI-assistenter til at læse virksomhedsdata.", "tag": "PROTOCOL"},
                {"year": 2025, "headline": "OpenAI and DeepMind unveil advanced test-time reasoning models", "headline_da": "Avancerede ræsonnerende modeller demonstreres", "snippet": "Search-based reflection allows models to verify logical proofs and self-correct software bugs.", "snippet_da": "Ræsonnement under generering gør modeller i stand til at rette egne softwarefejl.", "tag": "AI"},
                {"year": 2026, "headline": "Autonomous AI coding agents achieve 75% resolution on SWE-bench Verified", "headline_da": "Autonome kodningsagenter løser komplekse opgaver", "snippet": "Multi-agent pipelines automatically refactor repositories, write test suites, and execute lint fixes.", "snippet_da": "Multi-agent pipelines refaktorerer kodebaser og skriver automatiske testsæt.", "tag": "CODING"},
                {"year": 2026, "headline": "European Union Artificial Intelligence Act enters full enforcement", "headline_da": "EUs forordning om kunstig intelligens (AI Act) træder i kraft", "snippet": "Mandates strict auditing, watermarking, and transparency for frontier AI foundation models.", "snippet_da": "Kræver streng revision, vandmærkning og gennemsigtighed for avancerede AI-modeller.", "tag": "POLICY"}
            ]
        }
    },
    {
        "year": 2035,
        "title": "Quantum & Synthetic Intelligence",
        "subtitle": "Fault-tolerant quantum computing, neuromorphic silicon & AGI",
        "stats": {
            "title_da": "Kvanteteknologi & Syntetisk Intelligens",
            "subtitle_da": "Fejltolerant kvantecomputing, neuromorfe chips & AGI",
            "tagline": "Quantum qubits break encryption barriers while neuromorphic silicon matches biological efficiency.",
            "tagline_da": "Kvantekubitter bryder krypteringsbarrierer, mens neuromorfe chips opnår biologisk energieffektivitet.",
            "icon": "🔮",
            "moodColor": "#38ef7d",
            "roles": [
                ["Quantum Algorithm Dev", "$210k/YR", "Designs error-corrected quantum circuits for materials science and financial optimization.", "Designer fejlkorrigerede kvantekredsløb til materialevidenskab og optimering."],
                ["Neuromorphic Architect", "HIGH", "Engineers analog spiking neural network chips operating at biological microwatt power.", "Designer analoge spidse neurale chips med biologisk mikrowatt-strømforbrug."],
                ["Synthetic Biology Programmer", "CUTTING EDGE", "Codes DNA storage sequences and biological logic gates in cellular compute substrates.", "Koder DNA-datalagring og biologiske logiske porte i cellulære computere."],
                ["Post-Quantum Cryptographer", "CRITICAL", "Deploys lattice-based encryption securing global banking against Shor's algorithm.", "Implementerer gitterbaseret kryptografi til sikring af bankvæsen mod kvanteangreb."],
                ["AGI Alignment Officer", "ENTERPRISE", "Verifies autonomous synthetic intelligences adhere to strict ethical and legal invariants.", "Efterprøver at autonome syntetiske intelligenser overholder etiske og juridiske krav."]
            ],
            "stack": [
                ["Q# / PennyLane", "QUANTUM", "Hybrid quantum-classical programming environments for variational quantum algorithms.", "Hybride kvante-klassiske programmeringsmiljøer til variationsalgoritmer."],
                ["Neuromorphic Silicon", "HARDWARE", "Analog event-driven compute mimicking biological synaptic connectivity.", "Analoge hændelsesstyrede processorer, der efterligner biologiske synapser."],
                ["DNA Storage", "BIO STORAGE", "Petabyte-scale archival storage encoded in synthetic oligonucleotide chains.", "Petabyte-arkivlagring kodet i syntetiske DNA-molekylkæder."],
                ["Post-Quantum Cryptography", "SECURITY", "CRYSTALS-Kyber and Dilithium algorithms resistant to quantum cryptanalysis.", "Gitterbaserede algoritmer modstandsdygtige over for kvantebaseret dekryptering."],
                ["Photonic Compute", "OPTICS", "Light-speed matrix multiplication processors operating with near-zero heat dissipation.", "Optiske matrix-processorer, der regner med lysets hastighed uden varmeudvikling."]
            ],
            "hypeTopic": "Quantum Supremacy & Synthetic Biology",
            "hypeTopic_da": "Kvanteoverlegenhed & Syntetisk Biologi",
            "hypeDesc": "Million-qubit fault-tolerant systems simulate room-temperature superconductors while biological computers store petabytes in vials.",
            "hypeDesc_da": "Fejltolerante kvantecomputere simulerer nye materialer, mens biologiske computere lagrer petabytes af data i væskeampuller.",
            "milestones": [
                {"year": 2030, "title": "Logical Qubit Fault Tolerance Achieved", "title_da": "Fejltolerante Logiske Kvantebits", "desc": "Topological error correction enables million-step quantum calculations without decoherence.", "desc_da": "Topologisk fejlkorrektion muliggør million-trins kvanteberegninger."},
                {"year": 2032, "title": "Room-Temperature Photonic Neural Chips", "title_da": "Fotoniske Neurale Chips", "desc": "Optical computing accelerates transformer matrix math with 100x lower energy consumption.", "desc_da": "Optisk computing accelererer matrix-beregninger med 100x lavere energiforbrug."},
                {"year": 2035, "title": "Synthetic General Intelligence Integration", "title_da": "Syntetisk General Intelligens", "desc": "Self-improving AI systems independently discover novel physics theories and medicines.", "desc_da": "Selvforbedrende AI-systemer opdager nye fysiske teorier og lægemidler selvstændigt."}
            ],
            "chronicle": [
                {"year": 2030, "headline": "First 10,000 fault-tolerant logical qubit quantum processor operational", "headline_da": "Første 10.000 logiske kvantebits i drift", "snippet": "Decoherence barriers solved, enabling exact atomic simulation of molecular catalysts.", "snippet_da": "Kvantestøj overvundet, hvilket muliggør nøjagtig molekylær simulering af katalysatorer.", "tag": "QUANTUM"},
                {"year": 2032, "headline": "Global banking shifts 100% of payment rails to Post-Quantum Cryptography", "headline_da": "Globale banker skifter til post-kvante kryptering", "snippet": "Lattice encryption protects global currency reserves from quantum attack threats.", "snippet_da": "Gitterkryptografi sikrer globale valutareserver mod fremtidige kvanteangreb.", "tag": "SECURITY"},
                {"year": 2034, "headline": "Synthetic DNA archival centers store world library in 1 cubic meter", "headline_da": "Syntetisk DNA lagrer verdens viden på 1 kubikmeter", "snippet": "Oligonucleotide synthesizers achieve petabyte data writing at commercial cost.", "snippet_da": "DNA-synthesizere muliggør petabyte-datalagring med tusind års holdbarhed.", "tag": "BIOLOGY"},
                {"year": 2035, "headline": "Neuromorphic data centers consume 90% less power than legacy silicon", "headline_da": "Neuromorfe datacentre reducerer strømforbrug med 90%", "snippet": "Spiking analog chips allow planetary-scale AI inferences with negligible energy footprint.", "snippet_da": "Analoge hjerne-inspirerede chips tillader global AI-inferens med minimalt energiforbrug.", "tag": "HARDWARE"}
            ]
        }
    }
]

def seed_eras(session):
    """
    Seeds/upserts historical IT eras into the database.
    Uses on_conflict_do_update on 'year' so that new fields (chronicle, DA translations,
    milestones, icons) are always synchronized for both new and existing eras.
    """
    print(f"🕐 Synchronizing {len(ERAS_SEED)} historical IT eras (1964–2035)...")
    try:
        for era_data in ERAS_SEED:
            stmt = insert(Era).values(**era_data)
            stmt = stmt.on_conflict_do_update(
                index_elements=["year"],
                set_={
                    "title": stmt.excluded.title,
                    "subtitle": stmt.excluded.subtitle,
                    "stats": stmt.excluded.stats,
                }
            )
            session.execute(stmt)
        session.commit()
        print(f"✅ Successfully seeded/updated {len(ERAS_SEED)} IT eras.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding eras: {e}")
        raise
