import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { APP_ID } from '../lib/constants';

const rawData = `925415	HOTEL	Marc Aurel	Marc Aurel Strasse 8	1010 Wien	marcaurel@chello.at	0%	Bearbeiten
925355	HOTEL	Marriott	Parkring 12a	1010 Wien	vienna.marriott.info@marriotthotels.com	0%	Bearbeiten
925558	HOTEL	Mercure Grand Hotel Biedermeier Wien	Landstrasser Hauptstrasse 28	1030 Wien	h5357@accor.com	0%	Bearbeiten
925560	HOTEL	Mercure Imlauer Wien	Rotensterngasse 12	1020 Wien	h1831@accor.com	0%	Bearbeiten
925551	HOTEL	Mercure Josefhof Wien	Josefsgasse 4-6	1080 Wien	mercure@josefshof.com	0%	Bearbeiten
925555	HOTEL	Mercure Secession Wien	Getreidemarkt 5	1060 Wien	h3532@accor.com	0%	Bearbeiten
925554	HOTEL	Mercure Wien City	Hollandstrasse 3	1020 Wien	h1568@accor.com	0%	Bearbeiten
925559	HOTEL	Mercure Wien Westbahnhof	Felberstrasse 4	1150 Wien	h5358@accor.com	0%	Bearbeiten
925473	HOTEL	Mercure Wien Zentrum	Fleischmarkt 1	1010 Wien	h0781@accor.com	0%	Bearbeiten
925561	HOTEL	Nh Atterseehaus	Mariahilfer Strasse 78	1070 Wien	nhatterseehaus@mh-hotel.com	0%	Bearbeiten
925562	HOTEL	Nh Belvedere	Rennweg 12a	1030 Wien	nhbelvedere@nh-hotels.com	0%	Bearbeiten
925563	HOTEL	Nh Danube City	Wagramerstrasse 21	1220 Wien	nhdanubecity@nh.hotels.com	0%	Bearbeiten
925564	HOTEL	Nh Wien	Mariahilfer Strasse 32-34	1070 Wien	nhwien@nh-hotels.com	0%	Bearbeiten
925596	HOTEL	Opera Suites	Kärntner Strasse 47	1010 Wien	infp@operasuites.at	0%	Bearbeiten
925599	HOTEL	Pacassi	Hetzendorfer Strasse 79	1120 Wien	office@pacassi.at	0%	Bearbeiten
925425	HOTEL	Palais Coburg Residenz	Coburgbastei 4	1010 Wien	hotel.residenz@palais-coburg.com	0%	Bearbeiten
925657	HOTEL	Palais Coburg Residenz	Coburgbastei 4	1010 Wien		0%	Bearbeiten
925659	HOTEL	Palais Hansen Kempinski	Schottenring 24	1010 Wien	info.vienna@kempinski.com	0%	Bearbeiten
925705	HOTEL	Park Hyatt Wien	Am Hof 2	1010 Wien	vienna.park@hyatt.com	0%	Bearbeiten
925403	HOTEL	Park-Villa	Hasenauerstrasse 12	1190 Wien	hotel@parkvilla.at	0%	Bearbeiten
925566	HOTEL	Parkhotel Schönnbrunn	Hietzinger Hauptstraße 10-20	1130 Wien	parkhotel.schoenbrunn@austria-trend.at	0%	Bearbeiten
925433	HOTEL	Pension Christina	Hafnersteig 7	1010 Wien	christina@pertschy.com	0%	Bearbeiten
925426	HOTEL	Pension Domizil	Schulerstrasse 14	1010 Wien	info@hoteldomizil.at	0%	Bearbeiten
925379	HOTEL	Pension Dr. Geissler	Postgasse 14	1010 Wien	dr.geissler@hotelpension.at	0%	Bearbeiten
925406	HOTEL	Pension Neuer Markt	Seilergasse 9	1010 Wien	neuermarkt@hotelpension.at	0%	Bearbeiten
663721	HOTEL	Pension Nossek	Graben 17	1010 Wien	reservation@pension-nossek.at	0%	Bearbeiten
925464	HOTEL	Pension Suzanne	Walfischgasse 4	1010 Wien	info@pension-suzanne.at	0%	Bearbeiten
925567	HOTEL	Pertschy	Habsburgergasse 5	1010 Wien	pertschy@pertschy.com	0%	Bearbeiten
925505	HOTEL	Plaza				0%	Bearbeiten
100002	HOTEL	Post Wien	Fleischmarkt 24	1010 Wien	office@hotel-post-wien.at	0%	Bearbeiten
925750	HOTEL	Radisson Blu Style Hotel, Vienna				0%	Bearbeiten
925508	HOTEL	Radisson Sas Palais Hotel	Herrengasse 12	1010 Wien	sales.vienna@radissionsas.com	0%	Bearbeiten
925568	HOTEL	Rainers	Gudrunstrasse 184	1100 Wien	info@rainers-hotel.at	0%	Bearbeiten
925569	HOTEL	Rathaus-Wein & Design	Lange Gasse 13	1080 Wien	office@hotel-rathaus-wien.at	0%	Bearbeiten
925436	HOTEL	Rathauspark	Rathausstrasse 17	1010 Wien	rathauspark@austria-trend.at	0%	Bearbeiten
925571	HOTEL	Reither	Graumanngasse 16	1150 Wien	hotel.reither@aon.at	0%	Bearbeiten
925598	HOTEL	Riemergasse Appartemens Pemsion	Riemergasse 8	1010 Wien	office@riemergasse.at	0%	Bearbeiten
925679	HOTEL	Ritz Carlton				0%	Bearbeiten
925359	HOTEL	Römischer Kaiser	Annagasse 16	1010 Wien	info@rkhotel.bestwestern.at	0%	Bearbeiten
925603	HOTEL	Rosengarten	Underreingasse 33	1140 Wien	info@hotel-rosengarten.at	0%	Bearbeiten
925358	HOTEL	Royal	Singerstrasse 3	1010 Wien	royal@kremslehnerhotels.at	0%	Bearbeiten
925341	HOTEL	Sacher	Philharmonikergasse 4	1010 Wien	wien@sacher.com	0%	Bearbeiten
925666	HOTEL	Sans Souci Wien	Burggasse 2	1070 Wien	hotel@sanssouci-wien.com	0%	Bearbeiten
925574	HOTEL	Savoyen Vienna	Rennweg 16	1030 Wien	savoyen@austria-trend.at	0%	Bearbeiten
925575	HOTEL	Schild	Neustift am Walde 97-99	1190 Wien	office@hotel-schild.at	0%	Bearbeiten
925681	HOTEL	Schweizer				0%	Bearbeiten
925736	HOTEL	SO VIENNA	Praterstrasse 1, 1020 Vienna, Österreich			0%	Bearbeiten
925418	HOTEL	Sofitel Vienna	Am Heumarkt 35-37	1030 Wien	h1276@accor.com	0%	Bearbeiten
925606	HOTEL	Spiess & Spiess Appartment Pension	Hainburgerstrasse 19	1030 Wien	appartents@spiess-vienna.at	0%	Bearbeiten
925572	HOTEL	Sportpark	Weingartenallee 22	1220 Wien	hotel@sportparkwien.at	0%	Bearbeiten
925435	HOTEL	Starlight Suite	Renngasse 13	1010 Wien	reservation@starlighthotels.com	0%	Bearbeiten
925573	HOTEL	Starlight Suiten Hotel Heumarkt	Am Heumarkt 15	1030 Wien	reservation@starlighthotels.com	0%	Bearbeiten
925371	HOTEL	Stefanie	Taborstrasse 12	1020 Wien	stefanie@schick-hotels.com	0%	Bearbeiten
925739	HOTEL	Steigenberger Hotel	Herrengasse 10	1010 Wien		0%	Bearbeiten
925576	HOTEL	Strandhotel Alte Donau	Wagramerstrasse 51	1220 Wien	welcome@strandhotel-alte-donau.at	0%	Bearbeiten
925578	HOTEL	Strudlhof Hotel & Palais	Pasteurgasse 1	1090 Wien	hotel@strudlhof.at	0%	Bearbeiten
925398	HOTEL	STYLE HOTEL VIENNA	Herrengasse 12	1010 Wien	info.style.vienna@radissonsas.com	0%	Bearbeiten
925580	HOTEL	Suite-Hotel 900m Zur Oper	Wiedner Hauptstrasse 44	1040 Wien	hotel-oper900m@aon.at	0%	Bearbeiten
925655	HOTEL	Tabor	Taborstrasse 25	1020 Wien	tabor@city-hotels.at	0%	Bearbeiten
925582	HOTEL	The Imperial Riding School Vienna	Ungarngasse ß0	1030 Wien	imperial.reservations@renaissancehotels.com	0%	Bearbeiten
925737	HOTEL	The Levante Parliament			parliament@thelevante.com	0%	Bearbeiten
925461	HOTEL	The Ring	Kärntenerring 6	1010 Wien	info@theringhotel.com	0%	Bearbeiten
925577	HOTEL	Vienna	Grosse Stadtgutgasse 31	1020 Wien	hotel.vienna@aon.at	0%	Bearbeiten
925579	HOTEL	Vienna Sporthotel	Baumgasse 83	1030 Wien	info@vienna-sporthotel.at	0%	Bearbeiten
925581	HOTEL	Viennart	Breite Gasse 9	1070 Wien	viennart@austrotel.at	0%	Bearbeiten
925353	HOTEL	Wandl	Petersplatz 9	A-1010 Wien	concierge@hotel-wandl.com	0%	Bearbeiten
925583	HOTEL	Westbahn Hotel Am Europaplatz	Pelzgasse 1	1150 Wien	office@westbahn-hotel.at	0%	Bearbeiten
925722	HOTEL	Zipser	Lange Gasse 49		office@zipser.at	0%	Bearbeiten
925478	INTERN		Enbrook park	CT20 3SE Folkestone	Michelle.McDermott@saga.co.uk	0%	Bearbeiten
925495	INTERN					0%	Bearbeiten
925694	INTERN	Action Agency Austria	Hietzinger Hauptstraße 38a	1130	roland.heckl@a1.net	0%	Bearbeiten
925714	INTERN	Allegro Touristik e.U.	Marktgasse 6/36	1090 Wien		0%	Bearbeiten
925413	INTERN	Bildungsverein Kartause Gaming	Kartause 1	A- 3292 Gaming	ngalbraith@gwia.franciscan.edu	0%	Bearbeiten
925723	INTERN	Deutscher Orden Gästehaus				27%	Bearbeiten
925749	INTERN	Figaro PMA				0%	Bearbeiten
100001	INTERN	Mozarthaus (intern)			konzerte@mozarthaus.at	0%	Bearbeiten
100000	INTERN	Mozarthaus Webseite			konzerte@mozarthaus.at	0%	Bearbeiten
925402	INTERN	PerPedes Vermittlung von Stadt und Kulturführungen	Einsiedlergasse 6	1050 Wien	Christiana Broschek, Mag.Dkfm. Walter Broschek	0%	Bearbeiten
925416	INTERN	Siemens AG	Gudrunstraße 11	1100 Wien	manuel.grabl@siemens.com	0%	Bearbeiten
925651	INTERN	Sovereign Tourism	6 Weighhouse Street	W1K 5LT London	marisa@sovereigntourism.co.uk	0%	Bearbeiten
925620	INTERN	Top Tours Utazási Iroda Kft	Szentháromság u. 15.	6722 Szeged	toptours@toptours.hu	20%	Bearbeiten
925376	INTERN	Verk. Roschel	Singerstrasse 7	1010 Wien	konzerte@mozarthaus.at	0%	Bearbeiten
323214	ONLINEBUERO					0%	Bearbeiten
925491	ONLINEBUERO					0%	Bearbeiten
925676	ONLINEBUERO					0%	Bearbeiten
862351	ONLINEBUERO	A - Viennaconcerts	Neuer Markt 9 / 12A	1010 Wien	info@viennaconcerts.com	30%	Bearbeiten
217232	ONLINEBUERO	A&A Tickets Online	Operngasse 28/7	1040 Wien	office@classicworld.at	30%	Bearbeiten
925708	ONLINEBUERO	Airbnb	888 Brannan St, San Francisco, CA 94			0%	Bearbeiten
925690	ONLINEBUERO	allstarticket GmBH	Leopoldsg. 22	1020 Wien Wien	info@allstarticket.at	20%	Bearbeiten
925730	ONLINEBUERO	Augustinerstrasse Ticket Office				30%	Bearbeiten
925721	ONLINEBUERO	Buran Palais Palfy				30%	Bearbeiten
925662	ONLINEBUERO	Citytixx, VIVO Ticketing & more GmbH	Berthold- Brecht Allee 24	D-01309 Dresden	partnerservice@citytixx.com	25%	Bearbeiten
372610	ONLINEBUERO	Classical Europe	Schönbrunner Schlossstraße 47	1130 Wien Wien	office@classical-europe.com	35%	Bearbeiten
864371	ONLINEBUERO	Classictic	Boyen Strasse 41	10115 Berlin, Deutschland	info@classictic.com	20%	Bearbeiten
925608	ONLINEBUERO	ConcertVienna	Erndtgasse 13/5	1180 Wien	manager@concertvienna.com	32%	Bearbeiten
925678	ONLINEBUERO	Culture Ticket Kartenbüro GmbH	Mahlerstraße 5/1/41	1010 Wien	office@culture-ticket.com	30%	Bearbeiten
925746	ONLINEBUERO	Discover Culture	Piaristengasse 46 / 7	1080 Wien	order@discoverculture.com	30%	Bearbeiten
925472	ONLINEBUERO	EUROPERA RM Ticket GmbH	Wohllebengasse 6/2	1040 Wien	office@vienna-concert.com	30%	Bearbeiten
925711	ONLINEBUERO	GetYourGuide	Sonnenburger Strasse 73	10437 Berlin		30%	Bearbeiten
925753	ONLINEBUERO	Getyourguide Ticketing				0%	Bearbeiten
925728	ONLINEBUERO	Headout				20%	Bearbeiten
925707	ONLINEBUERO	Musement S.p.A				25%	Bearbeiten
925684	ONLINEBUERO	Music & Opera	16 rue Bleue	75009 Paris	gaelle@music-opera.com	30%	Bearbeiten
925504	ONLINEBUERO	Music of Vienna	Blumberggasse 4/3	1160 Wien	office@musicofvienna.com	30%	Bearbeiten
925717	ONLINEBUERO	Music of Vienna Gruppen	Blumberggasse 4/3	1160 Wien	office@musicofvienna.com	0%	Bearbeiten
925477	ONLINEBUERO	NetHotels Reisebüro	Neulinggasse 31	1030 Wien	office@vienna.nethotels.com	20%	Bearbeiten
925627	ONLINEBUERO	office viennatickets4you	Karlsplatz 1/10	1010 Wien	office@viennatickets4you.com	20%	Bearbeiten
925756	ONLINEBUERO	Oneevent	Opernring 1/E/536-537	1010 Wien	support@oneevent.at	30%	Bearbeiten
925467	ONLINEBUERO	OnlineTickets4You.com	Herzgasse 75/23	1100 Wien	office@onlinetickets4you.com	30%	Bearbeiten
925740	ONLINEBUERO	Opera Guide	Operngasse 6 / 1C		order@operaguide.com	30%	Bearbeiten
925692	ONLINEBUERO	Premium Events GmbH	Opernring 4/2/4	1010 Wien	bookings@viennapremiumtickets.com	30%	Bearbeiten
925752	ONLINEBUERO	Secret Vienna	Beheimgasse 62/24	1170 Wien	info@secretvienna.org	0%	Bearbeiten
925628	ONLINEBUERO	Ticket Online Austria GmbH	Gumpendorfer Straße 83-85/Haus 1/Büro 2	1060 Wien	veranstalterbetreuung@ticketonline.at	0%	Bearbeiten
925644	ONLINEBUERO	Ticket Shop&Salzburg Hotel Service, Dr. Berer e.u.	Getreidegass 5	5020 Salzburg	aurelie.mayer@mozartfestival.at	20%	Bearbeiten
925545	ONLINEBUERO	Viator			reservations@viator.com	20%	Bearbeiten
925492	ONLINEBUERO	Vienna Classic Online Ticket Office KG	Operngasse 6 / 1C	1010 Wien	order@viennaclassic.com	30%	Bearbeiten
925610	ONLINEBUERO	Vienna Concerts - Gruppe				0%	Bearbeiten
925624	ONLINEBUERO	Vienna Event Tickets	Brandmayergasse 30/4/5	1050 Wien	office@vienna-event-tickets.com	30%	Bearbeiten
925650	ONLINEBUERO	Vienna Ticket Agency 24/7 Online-Ticketing OG	Millergasse 10	1060 Wien	office@viennaticketagency.at	25%	Bearbeiten
372611	ONLINEBUERO	Vienna Ticket Office	Kärtner Strasse 51	1010 Wien	info@viennaticketoffice.com	30%	Bearbeiten
925683	ONLINEBUERO	Vienna Ticket Online CEV	Seyringerstrasse 17/7/16	1210 Wien	office@classicensemblevienna.com	30%	Bearbeiten
435321	ONLINEBUERO	Vienna Ticket Service	Börsegasse 1	1010 Wien	office@viennatickets.at	20%	Bearbeiten
925703	ONLINEBUERO	Viennaticketing	Hafnersteig 5/2/20	1010 Wien	sales@viennaticketing.com	30%	Bearbeiten
473625	ONLINEBUERO	Viennatickets	Auerspergstrasse 1	1080 Wien	office@viennatickets.com	30%	Bearbeiten
925693	ONLINEBUERO	Website Regiondo				0%	Bearbeiten
925709	ONLINEBUERO	Website Regiondo RECHNUNG				0%	Bearbeiten
138272	ONLINEBUERO	Z- lKonkurs Sefa	Humboldtgasse 38/14	1100 Wien	info@viennaticketonline.com	30%	Bearbeiten
925471	REISEBUERO					20%	Bearbeiten
663524	REISEBUERO	BTU Business Travel Unlimited Reisebüro GmbH	Operngasse 2 / 2. Stock	1010 Wien	pauer.opernreisen@diereiserei.at	20%	Bearbeiten
925391	REISEBUERO	Otello Reisebüro GmbH	Lange Gasse 1	1080 Wien	t.zelenka@otello.at	20%	Bearbeiten
925619	REISEBUERO	Aalto Tours	Plattleite 49	01324 Dresden		0%	Bearbeiten
925710	REISEBUERO	Abercrombie & Kent Europa Ltd.			GStracqualursi@europe.abercrombiekent.com	0%	Bearbeiten
925626	REISEBUERO	ACTILINGUA Academy	Wattmanngasse 15	1130 Wien	info@actilingua.com	0%	Bearbeiten
925625	REISEBUERO	ADWS Reisebüro GmbH	Kärntner Ring 5-7	1010 Wien	g.hellmann@welcome-service.at	20%	Bearbeiten
925434	REISEBUERO	AGENTUR HARTMANN	Liechtensteinstrasse 32-34	1090 Wien	Christa Hartmann [cch@agh.at]	20%	Bearbeiten
925759	REISEBUERO	Ailleurs Culture	15. Boulevard Seianelav	13012 MARSEILLE	claudine@ailleurs-culture.com	20%	Bearbeiten
925455	REISEBUERO	albatros travel service gmbh	Cuvilliésstrasse 14	D - 81679 München	l.haase@albatros-incentives.de	20%	Bearbeiten
925546	REISEBUERO	Alki Tours	6417-A Fauntleroy Way SW	98136 Seattle WA		0%	Bearbeiten
925417	REISEBUERO	ALT & JUNG Reisen GmbH	Burgplatz 29 ( am Schlossturm )	D-40213 Düsseldorf -Altstadt	janine.liffers@aujreisen.de	20%	Bearbeiten
925480	REISEBUERO	Apollo Reisen GmbH	Bayernstrasse 72	97204 Höchberg	info@apolloreisen.de	0%	Bearbeiten
925501	REISEBUERO	ATI Travel & Incentives	Sollingergasse 28/10	A-1190 Wien	ati@ati-vienna.at	20%	Bearbeiten
925671	REISEBUERO	ATI Travel & Incentives	Döblinger Hauptstraße 48-50/2/6	A-1190 Wien	ati@ati-vienna.at	20%	Bearbeiten
925618	REISEBUERO	Austria 4 you - Travel Karin Urteil Reisebüro GmbH	Hirschstettner Straße 19-21	1220 Wien	y.nazarenko@a4u-travel.at	20%	Bearbeiten
925611	REISEBUERO	Austria Travel	P.O.BOx 111	760-366-24 Yucca Valley, CA 92286 U.S.A	austriatravel.ws@gmail.com	20%	Bearbeiten
925344	REISEBUERO	AUSTRIAN AIRLINES	Troonstraat 130	B-1050 Brussels	valerie.misonne@austrian.com	0%	Bearbeiten
925390	REISEBUERO	AUSTRO PAULI Pauli Voyages GmbH	Paulanergasse 15	1040 Wien	individual@austropauli.at	0%	Bearbeiten
925409	REISEBUERO	AUSTROPA JAPAN INCOMING Eurotours Ges.m.b.H	Friedrichstrasse 7	1043 Wien	yoko.yamada@eurotours.at	20%	Bearbeiten
925665	REISEBUERO	Be-Inventive, Berg Simone e.U.	Kaiser Franz Ring 17	2500 Baden	simone@be-inventive.at	35%	Bearbeiten
925702	REISEBUERO	BETC | Commerce Tours Reisebüro GmbH	Mariahilfer Strasse 142	1150 Wien	donnalyn.b@bect.at	20%	Bearbeiten
925751	REISEBUERO	Boat Bike Tours. B.V.	Aambeeldstraat 20	1021 KB Amsterdam, The Netherlands	jana@boatbiketours.com	20%	Bearbeiten
925761	REISEBUERO	Borntobe Tour s.r.o.				0%	Bearbeiten
925668	REISEBUERO	Botros Incoming Reisebüro GmbH	Paulanergasse 4/9	1040 Wien	office@botros.at	20%	Bearbeiten
925695	REISEBUERO	BRIXBUREAU International e.U.	Gentzgasse 45	1180 Vienna	beatrix.krivanec@brixbureau.at	0%	Bearbeiten
925487	REISEBUERO	BTU Incoming	Operngasse 2/A	1010 Wien	k.hinum@btu.at	20%	Bearbeiten
925716	REISEBUERO	Butterfield & Robinson	5 Rue de Citeux	21200 Beaune - FRANCE	jill.rubin@butterfield.com	10%	Bearbeiten
925632	REISEBUERO	Cantata, Reise-und Eventagentur	Leibenfrostgasse 8/1-2	104 Wien	irina.tuktareva@cantata.at	20%	Bearbeiten
925348	REISEBUERO	Columbus	Opernpassage	1010 Wien	opernpassage@columbus.co.at	20%	Bearbeiten
925486	REISEBUERO	COLUMBUS Ihr Reisebüro GmbH & Co.KG	Universitätsring 8	1010 Wien	office@columbus-vienna.com	20%	Bearbeiten
925330	REISEBUERO	CONCEPTA INCOMING TRAVEL SERVICES	Margaretenstrasse 160	1050 Wien	office@concept-a.com	20%	Bearbeiten
925640	REISEBUERO	Der Reise-Bär/Travelling With The Bear	Robert Lachgasse 50/7	A-1210 Wien	travelbear@chello.at	20%	Bearbeiten
925633	REISEBUERO	DESTINATION GmbH	Garnisongasse 11/1a	A-1090 Wien	vitekh@destination.cz	20%	Bearbeiten
925700	REISEBUERO	Dr. Gill - Die Kunst des Reisens	Leezener Weg 3	22417 Hamburg	dr.gill@hamburg.de	0%	Bearbeiten
925661	REISEBUERO	DZK	Mostecká 21,	11800 Praha 1	olivier.roman@dzk-travel.com	0%	Bearbeiten
925441	REISEBUERO	Earthbound Expeditions USA	POBox 11305	WA 98110 Bainbridge Is. USA	matthew@earthboundexpeditions.com	20%	Bearbeiten
925725	REISEBUERO	EF Go Ahead Tours				10%	Bearbeiten
925621	REISEBUERO	Emad Tours Ges.m.b.H.	prakring 16	1010 Wien	emad-tours@emirates.net.ae	20%	Bearbeiten
925648	REISEBUERO	EUROTOURS Ges.m.b.H. Lassalestraße	Lassallestrasse 3	1020 Wien	stefanie.thueringer@eurotours.at	25%	Bearbeiten
925349	REISEBUERO	Group IST	Ginzkeyplatz 3/11	5020 Salzburg	istce@salzburg.co.at	20%	Bearbeiten
925408	REISEBUERO	GTW - GRIMM TOURISTIK WETZLAR	Schanzenfeldstraße 10	35578 Wetzlar	austria@grimm-touristik.de	20%	Bearbeiten
925731	REISEBUERO	HANKYU TRAVEL INTERNATIONAL EUROPE SRL	Maximilianstr. 29	80539 München	ryoko.kitasaka@hankyu-euro.com	10%	Bearbeiten
925698	REISEBUERO	Hapimag Resort Wien	Neudeggergasse 16 – 18	1080 Wien	rm2.wien@hapimag.com	0%	Bearbeiten
925485	REISEBUERO	High Life Reisen GmbH	Hauptstr. 6	A-6840 Götzis	info@highlife.at	20%	Bearbeiten
925733	REISEBUERO	HILL TOWN TOURS			arianna.c@hilltowntours.com	20%	Bearbeiten
925414	REISEBUERO	Imperial Connection Beck OEG	Uetzgasse 23/3	A - 2500 Baden	johanna.schmikal@imperial-connection.at	20%	Bearbeiten
925420	REISEBUERO	IMS Incoming Marketing Services Reisebüro GmbH	Gluckgasse 1	1010 Wien	claudia.painsi@ims-vienna.com	0%	Bearbeiten
925631	REISEBUERO	INBOUND Austria BB Inbound Tours & Groups GmbH	Hammerstraße 4	3184 Türnitz	blazic@inbound-austria.com	0%	Bearbeiten
925339	REISEBUERO	Incoming Austria	Ziglergasse 1	1070 Wien	reisen.freizeit@tui.co.at	20%	Bearbeiten
925431	REISEBUERO	inspiria event service GmbH	Aigner Strasse 4a	5020 Salzburg	d.nabe@inspiria.net	0%	Bearbeiten
925735	REISEBUERO	J2 Adventures Ltd	Adgar 360 Building	POB. 9037 6706054 Tel Aviv-Jaffa	Mlyuts@j2adventures.com	10%	Bearbeiten
925636	REISEBUERO	Jalpak International (Germany) GmbH	Rossmarkt 15	60311 Fran Deutschland	katharina.wiggert@jalpak.de	20%	Bearbeiten
925476	REISEBUERO	JALPAK INTERNATIONAL AUSTRIA Ges.m.b.H	Kärntnerstraße 11, 4. Stock, 1010	1010 Wien	vienna@jalpak.co.uk	20%	Bearbeiten
925360	REISEBUERO	JPI AUSTRIA	Weihburggasse 2	1010 Wien		20%	Bearbeiten
925494	REISEBUERO	Kuoni Destination Management Austria GmbH	Lerchenfelder Gürtel 43 Top4/1	1160 Wien	kathrin.brunner@at.kuoni.com	20%	Bearbeiten
925438	REISEBUERO	Kuoni Incoming Services GmbH & CoKG	Lerchenfelder Gürtel 43 / 4 / 1	1160 Wien	theresa.mosing@at.kuoni.com	20%	Bearbeiten
925479	REISEBUERO	Kuoni Laxenburgerstrasse	Laxenburgerstraße 34	1100 Wien	Gaby.Zecha@kuoni.at	20%	Bearbeiten
925511	REISEBUERO	Kverneland AS	Plogveien 1	N-4355 Kvernaland, Norway	Arild.Gjerde@kvernelandgroup.com	0%	Bearbeiten
925493	REISEBUERO	Liberty International Reise GmbH S.	F.W. Reiffeinsenstrasse 1	5061 Elsbethen/Salzburg	e.zotter@liberty-international.at	0%	Bearbeiten
925713	REISEBUERO	LK Tours	42 Rue des Jardins	68000 Colmar	sflecher@lktours.fr	15%	Bearbeiten
925442	REISEBUERO	Lloyd Touristik Services	Fasangartengasse 15/C12	1130 Wien	lloyd.touristik@utanet.at	20%	Bearbeiten
925490	REISEBUERO	Logistica Logistica	Wagramerstrasse 23/3/1.1	1220 Wien	Logistica@logistica.at	20%	Bearbeiten
925616	REISEBUERO	MELOUR GmbH	Franzensbrueckenstrasse 10-12	1020 wien	incoming5@melour.at	20%	Bearbeiten
925506	REISEBUERO	MELOUR Reisebüro GmbH	Franzensbrueckenstrasse 10-12	1202 Wien	incoming5@melour.at	20%	Bearbeiten
925446	REISEBUERO	Miki Travel Agency	Franzensbrückenstraße 5, 2. Stock	1020 Wien	k.badawy@group-miki.com	20%	Bearbeiten
925329	REISEBUERO	Mondial GmbH & Co. KG	Operngasse 20b	1040 Wien	info@mondial.at	30%	Bearbeiten
925701	REISEBUERO	Mondial GmbH & Co. KG Baden	Kaiser-Franz-Ring 2	2500 Baden	wunderl@mondial.at	30%	Bearbeiten
925742	REISEBUERO	Most Spirit	Ulmerfelderstrasse 5	3364 Neuhofen/Ybbs	ilse@mostspirit.at	0%	Bearbeiten
925635	REISEBUERO	Mundivision Reisebüro GesmbH	Auenbruggergasse 2/16	1030 Wien	individual@mundivision.com	20%	Bearbeiten
925451	REISEBUERO	Music Contact International	119 South Winooski Avenue	VT 05401 Burlington - Vermont	theri@music-contact.com	0%	Bearbeiten
925325	REISEBUERO	ÖSTERRIKE RESESERVICE	Box 4103	S-102 62 Stockholm	info@austria-travelservice.com	20%	Bearbeiten
925617	REISEBUERO	Panorama Tours & Travel GmbH Salzburg	Schrannengasse 2/2	5020 Salzburg	petz@panoramatours.com	0%	Bearbeiten
925458	REISEBUERO	Pantours-Blaguss Reisebüro G.m.b.H.	Wiedner Hauptstr. 15/1/2	1040 Wien	pantours2@pantours.at	20%	Bearbeiten
925757	REISEBUERO	PAXLANE DMC	128, City Road London	London; United Kingdom	info@paxlanedmc.com	20%	Bearbeiten
925691	REISEBUERO	PragInt Incentive & Travel Agency	Třebízského 8	12000 Praha	zuzana.duskova@pragint.cz	0%	Bearbeiten
925530	REISEBUERO	profi(t)center	Pfeilgasse 16/2/27	A-1080 Wien	profi.center@gmx.at	0%	Bearbeiten
925629	REISEBUERO	RAM Consulting GmbH	Degengasse 40/16	1160 Wien	renate.androsch-holzer@ram.at	0%	Bearbeiten
925389	REISEBUERO	Reisebüro CEDOK GmbH	Parkring 10/Eingang Liebenberggasse	1010 Wien	lydia.kaiser@cedok.at	20%	Bearbeiten
925762	REISEBUERO	Rotary Clubs Spittal an der Drau	Rothenthurn 85	9701 Rothenthurn	gottfried.kindler@gmail.com	0%	Bearbeiten
925748	REISEBUERO	SCANDI Travel GmbH	Gaswerkstrasse 7	D – 926 37	katka@scanditravel.com	0%	Bearbeiten
925333	REISEBUERO	SERVICE-REISEN GIESSEN Heyne GmbH&Co.KG	Rödgener Str. 12	D - 35394 Giessen	alpen-adria@servicereisen.de	20%	Bearbeiten
925715	REISEBUERO	Südwest Presse + Hapag Lloyd			goeppinger1@hapag-lloyd-reisebüro.de	0%	Bearbeiten
925704	REISEBUERO	Sugar Office	Märzstraße 107/25	1150 Wien	manu.gamper@sugar-office.com	0%	Bearbeiten
925712	REISEBUERO	T-made Trips GmbH	Antonigasse 77/11	1170 Wien	nina@tmadetrips.at	25%	Bearbeiten
925643	REISEBUERO	TC Group DMC	Walfischg. 6/1/330	1010 Wien	service@tcgroup-dmc.com	20%	Bearbeiten
925706	REISEBUERO	Titan Travel Srl	Via Fornace, 22	47981 Doga Repubblica di San Marino	gruppiestero@titan-travel.com	0%	Bearbeiten
925613	REISEBUERO	Toffe Tours nv	Krommewege 31c	9990 Maldegem, Belgium	bart.bels@toffetours.be	20%	Bearbeiten
925622	REISEBUERO	Top Bavaria Travel GmbH	Schulstrasse 11	80634 München	info@top-bavaria.de	0%	Bearbeiten
925734	REISEBUERO	TOP PLUS Entertainment s.r.o.	Nova Sarka 510/5	161 00 Praha 6-Liboc. Czech Republic	mj.topplus@gmail.com	20%	Bearbeiten
925503	REISEBUERO	Top Tours Utazási Iroda Kft	Szentháromság u. 15.	6722 Szeged	toptours@toptours.hu	0%	Bearbeiten
925669	REISEBUERO	TOP TRAVEL REISEN Ges.m.b.H.	Burgring 1/5	1010 Wien	hahsler@toptravel.at	20%	Bearbeiten
925345	REISEBUERO	TPA-TOURISMUSPLAN	Alleestrasse 82	2103 Langenzersdorf/Vienna	tpa@nextra.at	20%	Bearbeiten
925609	REISEBUERO	trans/touring production ab	Hantverkargatan 44	SE 11221 Stockholm	anki.scholin@transtouring.se	20%	Bearbeiten
925419	REISEBUERO	TRAVEL EUROPE Reiseveranstaltungs GmbH	Unterdorf 37a	6135 Stans	bettina.steiner@traveleurope.cc	20%	Bearbeiten
925507	REISEBUERO	Travel Partner Reisen GmbH	Untere Donaustraße 47 - B11	A-1020 Wie	k.eisenpass@travel-partner.com	20%	Bearbeiten
925475	REISEBUERO	TUI Incoming alps & cities	Zieglergasse 1	1070 Wien	ximena.geissler@tui.co.at	20%	Bearbeiten
925697	REISEBUERO	TUI Incoming alps & cities	Heiligenstädter Straße 31	1190 Wien	ursula.kaloumenos@tui.at	20%	Bearbeiten
925741	REISEBUERO	ViaggiareSicuri				10%	Bearbeiten
925454	REISEBUERO	Vienna Travel Service				20%	Bearbeiten
925744	REISEBUERO	VIT Promotion Touristik GmbH	Marokkanergasse 20/10	1030 Wien	elisabeth.balbuchta@vit-prom.at	20%	Bearbeiten
925337	REISEBUERO	WE DO	Operngasse 2	1010 Wien	s.zingaretti@btu.at	25%	Bearbeiten
925689	REISEBUERO	Wens Travel	Brinkzicht 20	3743 EX B The Netherlands	vivian.van.esch@wens.nl	0%	Bearbeiten
925724	REISEBUERO	WOEHRLE PIROLA AG Events & Public Relations	Rotwandstrasse 49	8021 Zürich	zimmermann@woehrlepirola.ch	0%	Bearbeiten
925747	REISEBUERO	Worldwide DMC Ltd.	223 Twickenham Road Isleworth	London TW7 6DH	procurement@wwdmc.com	20%	Bearbeiten
925638	SONSTIGE	American Express Platinum Concierge			platinumcardaustria@aexp.com	0%	Bearbeiten
925445	SONSTIGE	Anglo Irish Bank (Austria) AG	Rathausstrasse 20	1010 Wien	marianne.balogh@angloirishbank.at	0%	Bearbeiten
925482	SONSTIGE	Artyom	Schelleingasse 36/309	1040 Wien		0%	Bearbeiten
925680	SONSTIGE	Associazione Culturale In viaggio con le Muse	via Enrico Fonda, 29	34149 Trieste , Italia	belcomposto@gmail.com	10%	Bearbeiten
925387	SONSTIGE	BERNDORF BAND GmbH	Leobersdorferstr. 26	2560 Berndorf	Helga Schwaiger [hs@berndorf.co.at]	0%	Bearbeiten
925677	SONSTIGE	BEUMER Group Austria GmbH	Concorde Business Park 1/C/3 Top Nr. 23	2320 Schwechat	ju.ta@beumergroup.com	0%	Bearbeiten
925646	SONSTIGE	Bibiane Krapfenbauer -Horsky	Potzleinsdorfer Strasse 96/9	1180 Wien	bibiane.krapfenbauer@gmx.at	0%	Bearbeiten
925623	SONSTIGE	Centurion von American Express	Theodor-Heuss-Allee 112	60486 Frankfurt	CenturionCard@aexp.com	0%	Bearbeiten
925682	SONSTIGE	COME IN Congress Meeting Incentive Organisation	Alserstrasse 32/20	1090 Wien	gabriele@come-in.at	0%	Bearbeiten
925637	SONSTIGE	Cross Border Education	Lidwinahof 30	5481 HL SCHIJNDEL Nederland	irmgard.garber@rolmail.net	10%	Bearbeiten
925675	SONSTIGE	Cultours GmbH	Postfach 36	3602 Thun Schweiz	beatrice.zbinden@cultours.ch	0%	Bearbeiten
925519	SONSTIGE	Dizak Ketex GmbH	Esslingasse 5	1010 Wien	manuel.jimenez@dzk-travel.com	0%	Bearbeiten
925466	SONSTIGE	EAP	Schnirchgasse 9A / 4 / 410	1030 Wien	eap.headoffice@europsyche.org	0%	Bearbeiten
925370	SONSTIGE	Felix Austria GesmbH	Felixstrasse 24	7210 Mattersburg	cornelia.fass@felix.at	0%	Bearbeiten
925754	SONSTIGE	Grand Cuvée Tours	Maistrova 2a,	1234 Mengeš	sales@grandcuveetours.com	20%	Bearbeiten
925663	SONSTIGE	Herbert Stojaspal	Wipplingerstrasse 24-26	1010 Wien		0%	Bearbeiten
925488	SONSTIGE	Holper und Dworzak	Veronikagasse 27	1170 Wien	agnesdworzak@gmx.at	0%	Bearbeiten
925760	SONSTIGE	IBK Kulturtours GmbH	Dillstr. 16	D-20146 Hamburg	mail@ibk.kulturtours.de	0%	Bearbeiten
925653	SONSTIGE	IMC International	Barmherzigengasse 17/3/64	1030 Wien	m.pennino@imc-international.at	20%	Bearbeiten
925686	SONSTIGE	INCOMING Reisebüro GmbH NFG KG	Münzwardeingasse 4	1060 Wien		20%	Bearbeiten
925639	SONSTIGE	Ineke Oomens-Wielens, tourleder/guide	Linatestraat 27	5040 PP Ti Netherlands	i.oomens-wielens@planet.nl	20%	Bearbeiten
925758	SONSTIGE	Jap Tur Agencia Viagens LTDA	Av Presidente Vargas, 449	14020-260 Sao Paulo	ligia@japtur.com.br	20%	Bearbeiten
925440	SONSTIGE	Johannsen+Köhler Kommunikation	Börsenbrücke 5-7	20457 Hamburg	vera.koehler@jk-komminikation.de	0%	Bearbeiten
925437	SONSTIGE	Krippenverein Vösendorf	Johannisweg 2	2331 Vösendorf	krippenverein.voesendorf@kabsi.at	10%	Bearbeiten
925672	SONSTIGE	Kulturdienste Dr. Wolfgang Sand	Sonnenhof	3929 Täsch Schweiz	Wolfgang.Sand@t-online.de	20%	Bearbeiten
925615	SONSTIGE	KUNST+LITERATUR Kulturvermittlung	Flachter Str. 45/1	71287 Weissach	anetteochsenwadel@t-online.de	0%	Bearbeiten
925743	SONSTIGE	Lena Dolejschi Reiseleiterin				2%	Bearbeiten
925372	SONSTIGE	MATRIXWARE Information Services GmbH	Lehargasse 11/8	1060 Wien	S.Thal@matrixware.com	10%	Bearbeiten
925654	SONSTIGE	MOTION EUROPE LTD	14 South Molton Street,	W1K 5QP Lo UK	operations2@motion-europe.com	0%	Bearbeiten
925652	SONSTIGE	Net Travel Service Austria GmbH	Opernring 1, Floor 7, Entrance R, Top 701	1010 Wien	Filiz_Erkara@nts-aut.com	20%	Bearbeiten
925393	SONSTIGE	ORF	Würzburggasse 30	1136 Wien	enterprise@orf.at	0%	Bearbeiten
925483	SONSTIGE	Peter	Zaunscherbgasse 4/303			0%	Bearbeiten
925421	SONSTIGE	QUAIS DES VOYAGES	24, rue Yves Toudic	75010 PARIS	quaisdesvoyages@wanadoo.fr	0%	Bearbeiten
925688	SONSTIGE	Quintessentially	Berggasse 10/4, 1090 Vienna, Austria		elodie.sautour@Quintessentially.com	20%	Bearbeiten
925474	SONSTIGE	Reiseleiter Fr. Burger				0%	Bearbeiten
925674	SONSTIGE	Renate Hofbauer				0%	Bearbeiten
925343	SONSTIGE	Rigips Austria GmbH	Bräuhausg. 3-5	1050 Wien	eveline.langhans@bpb.com	0%	Bearbeiten
925614	SONSTIGE	Sabine Scheermesser	Ruppanerstr. 37	78464 Konstanz	S_scheermesser@gmx.de	0%	Bearbeiten
925699	SONSTIGE	SRC Cultuurvakanties		The Netherlands	ldewaal@zeelandnet.nl	0%	Bearbeiten
925489	SONSTIGE	Susane Holper			susane.holper@chello.at	0%	Bearbeiten
925641	SONSTIGE	Susi.at				0%	Bearbeiten
925673	SONSTIGE	VEKHZ Christine Markun-Braschler	Löwenstraße 1	8001 Züric Schweiz	gabriele.buchas@gmx.at	0%	Bearbeiten
925484	SONSTIGE	Venue dmc GmbH	MAriahilfer Strasse 89/27	1060 Wien	a.mally@venuedmc.at	20%	Bearbeiten
925384	SONSTIGE	Verrein für Ägyptische frauen &familien	Rotensterngasse 13/8	1020 Wien	aegypt_frauen@yahoo.de	10%	Bearbeiten
925645	SONSTIGE	Viennatour-Professionally guided tours	Wipplingerstrasse 24-26	1010 Wien	Herbert.stojaspal@tele2.at	20%	Bearbeiten
925607	SONSTIGE	WienTourismus	Obere Augartenstrasse 40	1020 Wien	delia.danner@wien.info	0%	Bearbeiten
925465	SONSTIGE	Wiesbadener Casino-Gesellschaft	Friedrichstrasse 22	65185 Wiesbaden	K.Kosanke@casino-gesellschaft.de	0%	Bearbeiten
925481	SONSTIGE	Younes	Wimmergasse 4/4	1050 Wien		0%	Bearbeiten
925356	TICKETBUERO		Kundratstrasse 16/2/13	1100 Wien	info@vienna-events.com	30%	Bearbeiten
925332	TICKETBUERO	AHR Agentur für Hotels und Reisen GmbH	Mariannengasse 32	1090 Wien	ulrica.hackl@aims-international.com	20%	Bearbeiten
346231	TICKETBUERO	admicos	Garnisonsgasse 7/22	1090 Wien	office@admicos.com	20%	Bearbeiten
925612	TICKETBUERO	All Events	Opernring 21	1010 Wien	info@allevent.com	20%	Bearbeiten
925696	TICKETBUERO	ALL-STAR TICKET GMBH	Leopoldsg. 22	1020 Wien	info@allstarticket.at	20%	Bearbeiten
925334	TICKETBUERO	ATT REISEBÜRO GMBH	Josefsplatz 6	1010 Wien	office@viennaticket.com	20%	Bearbeiten
925338	TICKETBUERO	Austropa Interconvention Österr. Verkehrsbüro AG	Friedrichstrasse 7	1010 Wien	katharina.steinbauer@interconvention.at	20%	Bearbeiten
925350	TICKETBUERO	COME IN	Alserstraße 32/20	1090 Wien	welcome@come-in.co.at	0%	Bearbeiten
925354	TICKETBUERO	Danske Special Rejser	Longangstaede 19	1468 Kobenhavn K	info@dsr-travel.dk	20%	Bearbeiten
925340	TICKETBUERO	ELITE TOURS	Operngasse 4	1010 Wien	ticket@elitetours.at	20%	Bearbeiten
675649	TICKETBUERO	Eurotours Ges.m.b.H.	Kirchberger Strasse 8	6370 Kitzbühel	vienna@eurotours.at	25%	Bearbeiten
925634	TICKETBUERO	Eurotours Wien-Japan Abteilung	Seidengasse 9/6/1	1070 Wien	yoko.yamada@eurotours.at	25%	Bearbeiten
842711	TICKETBUERO	Franz Jirsa GmbH	Opernring 1 E 438	1010 Wien	office@viennaticket.at	25%	Bearbeiten
925342	TICKETBUERO	Gullivers Travel Associates GmbH	Lindengasse 38/3	1070 Wien	vied@gta-travel.com	20%	Bearbeiten
925412	TICKETBUERO	IMPERIAL TOURS GmbH & Co KG	Dr. Karl Lueger-Ring 8	1010 Wien	konecny@imperial-tours.com	0%	Bearbeiten
925367	TICKETBUERO	Info Center Mozart				0%	Bearbeiten
925745	TICKETBUERO	KEFI S.A.	267, Kifissias Avenue,	145 61 Kif Athens,Greece		10%	Bearbeiten
925444	TICKETBUERO	Liberty Incentives & Congresses Vienna	Bechardgasse 17/3	1030 Wien	e.fickl@liberty-incentive.at	20%	Bearbeiten
925658	TICKETBUERO	Lienerbrünn	Augustinerstrasse			20%	Bearbeiten
925664	TICKETBUERO	Lüftner Incoming Touristik GmbH	Heiligenstädter Strasse 213	1190 Wien 1190 Wien	vienna@lueftner-cruises.com	0%	Bearbeiten
925331	TICKETBUERO	Österreich Werbung Budapest	Rippl-Rónai u. 4.	H - 1068 Budapest	ildiko.kaufmann@austria.info	0%	Bearbeiten
925321	TICKETBUERO	PANORAMA TOURS & TRAVEL GMBH	Hermanngasse 27	1070 Wien	vienna@panoramatours.com	20%	Bearbeiten
925380	TICKETBUERO	Pegasus Incoming Ges.m.b.H	Haydngasse 21	1060 Wien	headquarters@pegasus.at	20%	Bearbeiten
925670	TICKETBUERO	POLZER TRAVEL UND TICKETCENTER GMBH & CO. KG.	Residenzplatz 3,	5020 Salzburg		0%	Bearbeiten
925527	TICKETBUERO	Premium Events	Opernring 4/2/4	1010 Wien	office@premiumevents.info	30%	Bearbeiten
925392	TICKETBUERO	Rössler Kulturservice	Seilergasse 2 Ecke Graben 7	1010 Wien	office@kartenbuero.at	20%	Bearbeiten
925385	TICKETBUERO	SATO TOURS	Windmühlgasse 7	1060 Wien	reservas@satotours.eu	20%	Bearbeiten
925448	TICKETBUERO	Select- Tours & Clubs	Opernring 7/ 11	1010 Wien	ismet@select-tours.at	20%	Bearbeiten
925647	TICKETBUERO	Theaterkartenbüro Lienerbrünn	Augustinerstr. 7	1010 Wien Wien	linerbruenn@gmx.at	20%	Bearbeiten
925470	TICKETBUERO	Ticket Office Hoberg	Flossgasse 2/32	1020 Wien	ticketvienna@chello.at	30%	Bearbeiten
925720	TICKETBUERO	Ticketbüro Palais Palfy				0%	Bearbeiten
925335	TICKETBUERO	Tumlare Corporation Austria GmbH	Opernring 1/R/7.Stock/Tür 701	1010 Wien	Filiz_Erkara@nts-aut.com	30%	Bearbeiten
925377	TICKETBUERO	Verkehrsbuero-Ruefa Reisen GmbH	Untere Halle Westbahnhof	1150 Wien	21060@ruefa.at	20%	Bearbeiten
925395	TICKETBUERO	Verliebt in Wien			citywalks@verliebtinwien.at	0%	Bearbeiten
925336	TICKETBUERO	VIATOR-REISEN DR.HEINRICH HEGENER	Propsteihof 4	D - 44137 Dortmund		20%	Bearbeiten
334323	TICKETBUERO	Vienna Sightseeing				0%	Bearbeiten
925450	TICKETBUERO	Vienna Tourist Board	Obere Augartenstr. 40	1025 Wien	Buxbaum@vienna.info	0%	Bearbeiten
481348	TICKETBUERO	VIT Promotion	Schottenfeldgasse 62/18	1070 Wien	daniela.jaekkl@vit-prom.at	20%	Bearbeiten
925439	TICKETBUERO	VTM Kartenbüro GesmbH	Mahlerstr.5/1/41,	A-1010 Wien	office@vtm.at	30%	Bearbeiten
925401	TICKETBUERO	Welcome Touristic Vienna-Columbus KG	Dr. Karl Lueger Ring 8	1010 Wien	office@welcome-vienna.com	20%	Bearbeiten`;

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '_')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function runPartnerImport() {
  console.log('Starting Partner Bulk Import...');
  const lines = rawData.trim().split('\n');
  
  const parsedData = lines.map(line => {
    const cols = line.split('\t');
    
    const merchantNr = (cols[0] || '').trim();
    const art = (cols[1] || '').trim();
    let companyName = (cols[2] || '').trim();
    if (!companyName) {
      companyName = `Unbekannt ${merchantNr}`;
    }
    const strasse = (cols[3] || '').trim();
    const ort = (cols[4] || '').trim();
    const email = (cols[5] || '').trim();
    const provisionsSatzRaw = (cols[6] || '').trim();

    let commissionRate = 0;
    if (provisionsSatzRaw) {
      commissionRate = parseInt(provisionsSatzRaw.replace('%', ''), 10) || 0;
    }

    const id = slugify(companyName || merchantNr);

    return {
      id: `partner_${id}`,
      data: {
        firmenname: companyName,
        type: 'import_partner', // generic type
        art,
        merchantNr,
        strasse,
        ort,
        email,
        provisionsSatz: commissionRate,
        aktiv: true
      }
    };
  });

  console.log(`Parsed ${parsedData.length} records. Preparing batch upload...`);

  // Max batch size is 500 in Firestore
  const chunks = [];
  for (let i = 0; i < parsedData.length; i += 500) {
    chunks.push(parsedData.slice(i, i + 500));
  }

  for (let i = 0; i < chunks.length; i++) {
    const batch = writeBatch(db);
    for (const record of chunks[i]) {
      const docRef = doc(db, `apps/${APP_ID}/partners`, record.id);
      batch.set(docRef, record.data);
    }
    await batch.commit();
    console.log(`Uploaded batch ${i + 1} of ${chunks.length}`);
  }

  console.log('Import successfully completed!');
}
