const prisma = require('./prisma');
const { SEEDED_PROFILES, SEEDED_PROFILE_BY_USERNAME, GUEST_PROFILE_IMAGE } = require('./seed_profile_images');
const { deleteUserWithRelations } = require('./controllers/admin/deletionHelpers');

const authors = {
  karl_in_berlin: 'Karl Weber', texas_oil_man: 'John Walker', kyiv_defender: 'Maksym Petrenko', global_econ_prof: 'Professor Elena Novak', dr_leila_s: 'Dr. Leila Sadeghi', moscow_expat: 'Pavel Antonov', brit_politics_now: 'Oliver Grant', shipper_john: 'John Mercer', idf_supporter: 'David Cohen', anti_imperialist: 'Maya Ortiz', dc_insider: 'Rachel Brooks', energy_trader: 'Ryan Cole', french_nato_rep: 'Jean Moreau', guterres_fan: 'Sam Rivera', gulf_analyst: 'Hassan Al-Fayed', tehran_youth: 'Sara Nouri', israeli_tech_bro: 'Avi Ben-David', war_mapper: 'Alex Voss', trump_war_room: 'Grant Miller', climate_doom: 'Luna Hart', iraqi_voice: 'Omar Al-Karim', slava_ukraini_88: 'Olena Shevchenko', saudi_econ: 'Fahad Al Saud', market_watcher: 'R. Patel', peace_now_plz: 'Grace Miller', vlad_fan: 'Viktor Sokolov', eu_diplomat: 'Clara Fischer', cynic_supreme: 'Ash Morgan', history_buff: 'Professor Grant', lebanon_diaspora: 'Nadia Haddad', tank_commander_z: 'Dmitri Orlov', un_observer: 'Daniel Reeves', tech_bull: 'Trevor Pike', human_rights_watchdog: 'Sana Malik', military_historian: 'Marcus Hale', peace_activist: 'Lily Park', geo_realist: 'Theo Carter', free_iran_now: 'Maryam Azadi', eu_bureaucrat: 'Nikolai Weiss', trucker_dave: 'Dave Miller', ccp_watcher: 'Nikhil S.', uk_nurse_sarah: 'Sarah Clarke', russian_dissident: 'Irina Volkova', shipping_insider: 'Mike D.', maga_patriot_24: 'Brad King', eco_warrior_x: 'Ivy Green', un_critic: 'Adrian Fox', yemen_watcher: 'Ahmed Noor', farm_girl_ia: 'Kayla Sun', void_gazer: 'Noah Black', geopol_junkie: 'Jordan Lee', sarah_smiles_99: 'Sarah Miles', liberty_bell_76: 'Ben Turner', realist_thinker: 'Leo Stone', eco_warrior_x: 'Ivy Green', human_rights_watchdog: 'Sana Malik', free_iran_now: 'Maryam Azadi', pavel_v: 'Pavel Volkov', z_force_win: 'Zakhar Morozov', neutral_guy: 'Ethan Miles', tory_boy_99: 'Harry Wilson', left_wing_larry: 'Larry White', royal_navy_vet: 'Victor Reyes', farm_girl_ia: 'Kayla Sun', city_slicker: 'Chloe James', beirut_survivor: 'Rana Haddad', un_critic: 'Adrian Fox', peace_activist: 'Lily Park', marxist_student: 'Mia Brooks', ccp_watcher: 'Nikhil S.', eu_diplomat: 'Clara Fischer', america_first_24: 'Derek White', nato_skeptic: 'Leo Fischer', paris_strong: 'Camille Dupont', legal_eagle: 'Marcus Hale', econ_wonk: 'Naomi Clarke', ny_zionist: 'Daniel Stein', defense_contractor: 'Max Ortega', green_berlin: 'Hannah Klein', tech_bull: 'Trevor Pike', crypto_king_99: 'Zach Rivera', drone_pilot_x: 'Alex Rivera', navy_vet: 'Victor Reyes', taiwan_strong: 'Priya Lin', shipping_insider: 'Mike D.', sammy_sunshine: 'Samantha Ray'
};

const AUTHOR_USERNAMES = SEEDED_PROFILES.slice(0, 20).map((profile) => profile.username);
const COMMENT_USERNAMES = SEEDED_PROFILES.map((profile) => profile.username);
const SHINE_COMMUNITY_NAME = 'Shine';

const posts = [
{n:1,a:'karl_in_berlin',d:'2026-05-14',t:'opinion',k:['Iran ceasefire','Supreme Leader','Middle East strategy'],v:1890,l:412,s:88,c:18,x:['Everyone cheering about the "temporary ceasefire" with Iran is utterly delusional. We literally assassinated their Supreme Leader. You don\'t just sign a 60-day MoU and go back to normal after that. Tehran is just buying time to rebuild their missile stockpiles while the Strait of Hormuz stays choked. We are being played.'],m:[['geopol_junkie','Exactly. Mojtaba Khamenei cannot afford to look weak right now.'],['sarah_smiles_99','I just want gas prices under €3 a liter again. I don\'t care what they sign.'],['void_gazer','The US thought "regime change from the skies" would work. It never does.']]},
{n:2,a:'texas_oil_man',d:'2026-05-15',t:'opinion',k:['naval blockade','Trump foreign policy','Strait of Hormuz'],v:1950,l:650,s:140,c:22,x:['Trump authorizing a naval blockade of Iran is the first time a US President has actually shown backbone in the Gulf in a decade. You can\'t let a rogue state hold 20% of the world\'s oil hostage because they are throwing a temper tantrum over losing their military infrastructure. Sink any ship that tries to lay mines.'],m:[['peace_now_plz','It\'s an illegal act of war under international law, but sure, "backbone."'],['liberty_bell_76','We should have done this the second they attacked commercial shipping.'],['market_watcher','Good luck enforcing a blockade without igniting a massive regional war.']]},
{n:3,a:'kyiv_defender',d:'2026-05-15',t:'analysis',k:['Ukraine war','Russian truce','drone strikes'],v:1750,l:520,s:115,c:24,x:['The May 9 Victory Day "truce" was the most predictable Russian lie of the entire war. They used the 48 hours to reposition their artillery in Kharkiv and then immediately launched 800 drones at us. Anyone in the UN still pushing for "negotiated settlements" with Moscow is actively complicit in our genocide.'],m:[['un_observer','The UN is just trying to stop the death spiral, we aren\'t complicit.'],['slava_ukraini_88','Never trust a treaty signed by Putin. Never.'],['realist_thinker','Ukraine struck Moscow on the 17th. Neither side actually wanted the truce.']]},
{n:4,a:'global_econ_prof',d:'2026-05-16',t:'critique',k:['oil reserves','energy crisis','climate hypocrisy'],v:1420,l:380,s:95,c:15,x:['The sheer hypocrisy of the 32 IEA nations releasing 400 million barrels of strategic oil reserves to lower prices while lecturing the Global South on the "green transition" is staggering. When Western economies are threatened, climate goals vanish overnight. It was never about the planet; it was always about energy dominance.'],m:[['eco_warrior_x','It\'s sickening. We are subsidizing the destruction of the earth to maintain cheap shipping.'],['trucker_dave','Easy to say from a university office. My freight business is bankrupt because of diesel prices.'],['market_watcher','It\'s a stopgap measure to prevent a global depression.']]},
{n:5,a:'dr_leila_s',d:'2026-05-16',t:'opinion',k:['Iran protests','internet blackout','human rights'],v:1680,l:490,s:130,c:20,x:['The internet blackout in Iran isn\'t just about suppressing protest; it\'s a cover for mass executions. The regime is using the cover of the war with the US and Israel to completely purge the domestic opposition. The international media is completely failing the Iranian people right now.'],m:[['human_rights_watchdog','We are trying to verify the numbers, but the communication blackout is near total.'],['free_iran_now','The US bombs us and the regime shoots us. We are completely abandoned.'],['cynic_supreme','The media only cares when American soldiers are involved.']]},
{n:6,a:'moscow_expat',d:'2026-05-17',t:'poll',k:[],o:['Yes, air defenses are strong','No, I\'m leaving','Never felt safe anyway','It\'s just propaganda'],v:890,l:0,s:25,c:12,x:['After the Ukrainian drone strike on the Dom na Mosfilmovskoy skyscraper in Moscow, do you feel safe in the Russian capital?'],m:[['pavel_v','Air defenses clearly failed. The drone got within 6km of the Kremlin.'],['z_force_win','It was a lucky hit. Ukraine is desperate and losing on the ground.'],['neutral_guy','I moved my family to Dubai last month. Best decision ever.']]},
{n:7,a:'brit_politics_now',d:'2026-05-18',t:'critique',k:['UK politics','Keir Starmer','Iranian missiles'],v:1150,l:275,s:45,c:16,x:['Starmer saying he "doesn\'t believe in regime change from the skies" is peak weak British diplomacy. The RAF is actively defending bases in Cyprus and Bahrain from Iranian missiles, but Keir is too terrified of his own backbenchers to actually commit to defeating the Iranian threat. Stop sitting on the fence!'],m:[['tory_boy_99','Labour is always weak on defense. Always.'],['left_wing_larry','We shouldn\'t be involved in Trump\'s reckless Middle Eastern wars in the first place!'],['royal_navy_vet','We don\'t have the fleet capacity for a full deployment anyway.']]},
{n:8,a:'shipper_john',d:'2026-05-19',t:'opinion',k:['supply chain','fertilizer shortage','global shipping'],v:1850,l:510,s:180,c:25,x:['People don\'t realize the global supply chain is literally days away from total collapse. With the Strait of Hormuz closed, we aren\'t just losing oil—we are losing liquid natural gas for fertilizers. Food prices are going to double by August. The UN Security Council needs to mandate a naval escort for commercial vessels immediately.'],m:[['farm_girl_ia','Fertilizer prices are already up 40% here in the US. We can\'t plant at these margins.'],['geo_realist','Escorts mean shooting at Iranian fast boats. That means open war.'],['city_slicker','I’m stocking up on canned goods. This feels worse than 2020.']]},
{n:9,a:'idf_supporter',d:'2026-05-20',t:'opinion',k:['Israel defense','Hezbollah','Lebanon conflict'],v:1920,l:620,s:155,c:21,x:['The UN calling out Israel for civilian casualties in Lebanon while Hezbollah hides 1,900 fighters in residential basements in Beirut is a sick joke. Israel has every right to dismantle the launch sites that are firing daily into the Galilee. The Lebanese government banned Hezbollah; now let the IDF finish the job.'],m:[['beirut_survivor','"Finishing the job" means flattening my neighborhood. My family has nothing to do with Hezbollah.'],['un_critic','The UNIFIL forces have been useless for twenty years.'],['peace_activist','Collective punishment is a war crime, no matter the justification.']]},
{n:10,a:'anti_imperialist',d:'2026-05-20',t:'critique',p:9,k:['imperialism','displacement','Middle East policy'],v:1340,l:410,s:65,c:18,x:['Replying to @idf_supporter from Post 9: You are justifying the displacement of one-sixth of Lebanon\'s population. It\'s not "defense" when you destroy entire sovereign nations. The US-Israel joint strikes are just a continuation of colonial aggression to secure oil and regional hegemony.'],m:[['idf_supporter','Defending your borders from thousands of rockets isn\'t colonialism, it\'s survival.'],['marxist_student','The military-industrial complex is the only winner here.'],['history_buff','Lebanon is a failed state. This was inevitable once Iran took over their politics.']]},
{n:11,a:'dc_insider',d:'2026-05-21',t:'analysis',k:['Xi Putin summit','China Russia relations','Ukraine war'],v:1650,l:340,s:75,c:14,x:['The Xi-Putin summit in Beijing is terrifying. China refusing to explicitly back Russia\'s new May offensives in Ukraine means Putin is increasingly isolated, BUT it also means Russia might do something insanely desperate to force a conclusion. If Beijing cuts off the microchip supply, the Russian war machine dies in three months.'],m:[['ccp_watcher','Xi wants stability for trade. Putin\'s chaos is hurting the Belt and Road initiative.'],['vlad_fan','Russia doesn\'t need China. We have our own defense industry.'],['eu_diplomat','We need to offer Beijing massive trade incentives to officially drop Moscow.']]},
{n:12,a:'energy_trader',d:'2026-05-22',t:'opinion',k:['Russian oil','US sanctions','Ukraine funding'],v:1980,l:750,s:210,c:25,x:['The US temporarily dropping sanctions on Russian oil just to offset the Iranian blockade is the most cynical, morally bankrupt policy I\'ve ever seen. We are literally funding Putin\'s missiles hitting Kyiv just so American voters don\'t have to pay $5 a gallon before the midterms. Disgusting.'],m:[['slava_ukraini_88','Utter betrayal by the Trump administration. Ukrainian blood for American gas.'],['america_first_24','Domestic stability comes first. We can\'t fund Ukraine if our own economy collapses.'],['cynic_supreme','Geopolitics is just math without a soul. Welcome to reality.']]},
{n:13,a:'french_nato_rep',d:'2026-05-23',t:'poll',k:[],o:['Yes, immediately','No, Gulf bases are out of area','Only if mass casualties occur','Withdraw all troops now'],v:1100,l:0,s:34,c:13,x:['Should NATO Article 5 be triggered if Iran explicitly attacks a European military base in the Gulf (like the French base in UAE)?'],m:[['nato_skeptic','The Gulf is not the North Atlantic. Keep us out of it.'],['paris_strong','An attack on our soldiers is an attack on France. Strike back hard.'],['legal_eagle','The treaty specifically limits geographical scope. Article 5 wouldn\'t legally apply.']]},
{n:14,a:'guterres_fan',d:'2026-05-24',t:'opinion',k:['UN Security Council','Guterres','Ukraine escalation'],v:1450,l:320,s:60,c:17,x:['UN Secretary-General Guterres warning that the Ukraine war is in a "death spiral" is an understatement. With Russia losing net territory this month, they are going to rely entirely on flattening cities from the air. The Security Council is broken. If we don\'t get a demilitarized zone by June, Kyiv will be a crater.'],m:[['realist_thinker','The UN has been useless since the Cold War. Stop looking to them for solutions.'],['peace_now_plz','We need immediate, unconditional peace talks. No more weapons shipments.'],['kyiv_defender','Appeasement doesn\'t work. Give us long-range missiles to hit Russian airbases.']]},
{n:15,a:'gulf_analyst',d:'2026-05-24',t:'critique',p:12,k:['pragmatism','energy markets','global economy'],v:1220,l:290,s:42,c:15,x:['Replying to @energy_trader from Post 12: You call it cynical; I call it pragmatic triage. The collapse of the global energy market would cause famines in Africa and Asia within months. Sanctioning both Russia and Iran simultaneously was a luxury the West could only afford during peacetime. You have to pick your enemies.'],m:[['energy_trader','You don\'t triage by throwing your allies under the bus.'],['econ_wonk','He\'s right. The math doesn\'t work. The world needs 100 million barrels a day to function.']]},
{n:16,a:'tehran_youth',d:'2026-05-25',t:'opinion',k:['Iran revolution','US intervention','regime oppression'],v:1990,l:810,s:240,c:23,x:['I marched in the December protests. We wanted freedom, not a US invasion. The American bombs didn\'t liberate us; they just gave the IRGC an excuse to declare martial law and execute my friends as "spies." The West\'s obsession with "Operation Epic Fury" has destroyed our only chance at a real revolution.'],m:[['dc_insider','The strikes were meant to degrade the nuclear program, not spark a revolution.'],['human_rights_watchdog','We hear you and are trying to document the atrocities. Stay safe.'],['anti_imperialist','This is what US intervention always does. It destroys grass-roots movements.']]},
{n:17,a:'israeli_tech_bro',d:'2026-05-25',t:'opinion',k:['Iron Dome','preemptive strike','Iran missiles'],v:1560,l:480,s:85,c:19,x:['People complaining about the "disproportionate" response against Iran are willfully ignoring the fact that Tehran fired thousands of ballistic missiles at us. The Iron Dome held, but barely. If we hadn\'t preemptively taken out their launch sites in February, Tel Aviv would look like Mariupol right now. It was self-defense.'],m:[['beirut_survivor','And your "self-defense" left thousands dead in Lebanon.'],['ny_zionist','100% correct. You can\'t negotiate with a regime whose stated goal is your annihilation.'],['peace_activist','The cycle of violence just guarantees your children will fight the same war in 20 years.']]},
{n:18,a:'war_mapper',d:'2026-05-26',t:'analysis',k:['ISW data','Russian military','civilian targeting'],v:1780,l:550,s:110,c:22,x:['Looking at the ISW data for May: Russian forces lost a net 69 square miles of Ukrainian territory. Their ground offensives have completely stalled. That\'s why they hit the Starobilsk educational complex and residential blocks in Kyiv. When the Russian army fails on the battlefield, it resorts to sheer state terrorism against civilians.'],m:[['vlad_fan','The school was housing Ukrainian mercenaries. It was a legitimate military target.'],['kyiv_defender','Don\'t listen to Russian bots. It was a school. They are monsters.'],['military_historian','It\'s the Grozny playbook. Artillery leveling when infantry fails.']]},
{n:19,a:'trump_war_room',d:'2026-05-26',t:'poll',k:[],o:['Yes, America is safer','No, it was reckless','It\'s complicated','Just fix the gas prices'],v:1950,l:0,s:210,c:25,x:['President Trump\'s strong decisive action eliminated Iran\'s terror leadership and protected Israel. Do you support his handling of the 2026 Iran War?'],m:[['left_wing_larry','3,000+ people are dead and global trade is paralyzed. How is that "safe"?'],['maga_patriot_24','Best commander in chief ever. He did what Biden was too scared to do.'],['cynic_supreme','"Just fix the gas prices" is the only honest answer here.']]},
{n:20,a:'climate_doom',d:'2026-05-27',t:'opinion',k:['military budget','climate change','renewable energy'],v:1850,l:630,s:175,c:20,x:['The Pentagon just requested another $200 billion for the Iran war. Imagine if we spent $200 billion in three months on renewable energy grids instead of dropping bombs on Bandar Abbas. We are literally burning the planet to secure control over the oil that is causing the planet to burn. The irony is suffocating.'],m:[['defense_contractor','National security requires a secure energy supply today, not solar panels in ten years.'],['eco_warrior_x','Preach! The military is the biggest polluter on earth.'],['texas_oil_man','Go hug a tree. Grown-ups are trying to keep the lights on.']]},
{n:21,a:'iraqi_voice',d:'2026-05-27',t:'critique',p:1,k:['Iraq sovereignty','proxy war','Middle East'],v:1420,l:410,s:80,c:16,x:['Replying to @karl_in_berlin from Post 1: Why does everyone forget Iraq? We have dozens of soldiers and civilians dead because the US and Iran decided to use our country as their personal boxing ring again. The Iraqi PMU fighters dying in these crossfires are destabilizing our entire government. Get your proxy wars out of our borders!'],m:[['geo_realist','Unfortunately, geography is destiny. Iraq is caught in the middle.'],['karl_in_berlin','Fair point. The collateral damage to Iraqi sovereignty has been completely ignored by Western media.']]},
{n:22,a:'slava_ukraini_88',d:'2026-05-28',t:'opinion',k:['UN bias','Kyiv strikes','Russian aggression'],v:1670,l:510,s:95,c:18,x:['The fact that the UN had to hold an emergency meeting because debris from a Russian missile hit a UN housing compound in Kyiv is laughable. Where were your emergency meetings when they blew up our hospitals in 2022? You only care when your own diplomats get their windows rattled!'],m:[['un_observer','We have condemned the invasion since day one. We are doing our best.'],['kyiv_defender','The UN is a joke. Give us F-35s.']]},
{n:23,a:'saudi_econ',d:'2026-05-28',t:'analysis',k:['Saudi Arabia','Gulf geopolitics','Vision 2030'],v:1350,l:290,s:50,c:14,x:['The Iran war is a massive strategic win for Saudi Arabia, despite the civilian casualties we suffered from Iranian drones. With Iran\'s naval capabilities degraded (155 vessels destroyed), Riyadh now has undisputed hegemony over the Red Sea and Gulf development projects. This guarantees the success of Vision 2030 without Iranian interference.'],m:[['yemen_watcher','And what about Yemen? Is Riyadh just going to escalate there now?'],['market_watcher','If they can keep the oil flowing, the US will let them do whatever they want.']]},
{n:24,a:'market_watcher',d:'2026-05-28',t:'poll',k:[],o:['100% inevitable','Likely','Unlikely','We are already in one'],v:1500,l:0,s:42,c:17,x:['With the US Treasury sanctioning the "Persian Gulf Strait Authority" (PGSA), how likely is a global recession in Q3 2026?'],m:[['energy_trader','We are already in one. Supply chains are dead.'],['tech_bull','Dell stocks are soaring! AI is keeping the market afloat despite the war.']]},
{n:25,a:'peace_now_plz',d:'2026-05-29',t:'opinion',k:['economic sanctions','global trade','humanitarian crisis'],v:1100,l:220,s:35,c:11,x:['The US Treasury threatening to sanction anyone who pays Iran\'s "protection racket" tolls in the Strait of Hormuz is going to starve innocent people. Shipping companies will just avoid the route entirely, meaning food and medicine won\'t reach the Middle East or East Africa. Economic warfare is still warfare.'],m:[['texas_oil_man','If you pay the toll, you fund the IRGC. It\'s that simple.'],['shipping_insider','We literally cannot afford to lose our ships to mines. We have to follow US orders.']]},
{n:26,a:'vlad_fan',d:'2026-05-29',t:'critique',p:18,k:['Russian infrastructure','Ukrainian strikes','Western funding'],v:980,l:150,s:20,c:15,x:['Replying to @war_mapper from Post 18: Ukraine hitting three major Russian energy facilities overnight in Astrakhan and Yaroslavl proves that Kyiv isn\'t defending itself, they are trying to destroy the Russian state. The West is funding a terrorist regime that attacks civilian infrastructure deep inside Russia.'],m:[['kyiv_defender','Refineries fuel your tanks that murder our children. They are military targets.'],['neutral_guy','Escalation on both sides is just making peace impossible.']]},
{n:27,a:'eu_diplomat',d:'2026-05-29',t:'opinion',k:['Islamabad talks','European energy','nuclear power'],v:1340,l:310,s:55,c:12,x:['The failure of the Islamabad Talks mediated by Pakistan is a devastating blow. We thought an Asian mediator could bridge the gap between Trump and Mojtaba Khamenei, but neither side is willing to blink. Europe is now bracing for a massive winter fuel shortage. We must accelerate our domestic nuclear energy programs immediately.'],m:[['green_berlin','Nuclear is too slow to build. We need heavy investment in wind and grid storage!'],['french_nato_rep','France tried to tell you all years ago. Nuclear independence is the only way.']]},
{n:28,a:'cynic_supreme',d:'2026-05-30',t:'analysis',k:['military industrial complex','arms sales','US foreign policy'],v:1880,l:620,s:190,c:24,x:['The 2026 Iran War wasn\'t about nuclear weapons or Israeli security. It was the US military-industrial complex realizing that the Ukraine war was stalemating, and they needed a new, high-tech theater to demonstrate their latest toys to global buyers. 900 strikes in 12 hours? It was a live-fire sales pitch to the Gulf Arab states.'],m:[['dc_insider','That\'s a ridiculous conspiracy theory. Khamenei was actively directing proxy attacks on US troops.'],['anti_imperialist','This is the most accurate take on this entire thread.']]},
{n:29,a:'history_buff',d:'2026-05-30',t:'poll',k:[],o:['The US-Iran War','The Russia-Ukraine War','They are equally destructive','China\'s rise (silent winner)'],v:1400,l:0,s:60,c:16,x:['Which conflict will have a more profound impact on the geopolitical map of 2030?'],m:[['ccp_watcher','China is the silent winner. While the US and Russia bleed their treasuries, Beijing is buying up the Global South.'],['geo_realist','Ukraine war reshaped Europe. Iran war reshaped global trade. Both are massive.']]},
{n:30,a:'lebanon_diaspora',d:'2026-05-30',t:'opinion',k:['Lebanon sovereignty','civilian casualties','Hezbollah'],v:1760,l:580,s:145,c:21,x:['Seeing the IDF and Hezbollah tear Lebanon apart *again* is soul-crushing. The Lebanese government is powerless, the UN is useless, and the civilian death toll is horrific. Our country is nothing but a sandbox for foreign powers to test their missiles. We deserve sovereignty!'],m:[['beirut_survivor','I have lost my home and my business. There is nothing left here.'],['idf_supporter','Expel Hezbollah and you will have peace.'],['anti_imperialist','Blaming the victim. Classic colonial mindset.']]},
{n:31,a:'tank_commander_z',d:'2026-05-30',t:'critique',p:3,k:['Russian military','Donbas','Western aid'],v:850,l:120,s:15,c:14,x:['Replying to @kyiv_defender from Post 3: You mock our Victory Day, but your counterattacks in Kharkiv are failing. You took back Odradne? Big deal, it\'s a field. We hold the industrial capacity of Donbas. Enjoy your temporary drone strikes on Moscow; winter is coming and your Western backers are running out of money.'],m:[['kyiv_defender','We took back 22 square kilometers and broke your lines. Keep coping while your ruble collapses.'],['military_historian','The sheer attrition rate on both sides is unsustainable for another winter.']]},
{n:32,a:'un_observer',d:'2026-05-30',t:'opinion',k:['international law','United Nations','global order'],v:1950,l:680,s:205,c:25,x:['Volker Türk’s plea for restraint is falling on deaf ears. When the US bypassed the Security Council to launch Operation Epic Fury, it signaled to Russia that international law is officially dead. You cannot demand Putin respect UN charters in Ukraine while Washington ignores them in the Middle East. The rules-based order is finished.'],m:[['legal_eagle','The US claimed self-defense under Article 51. It\'s legally debatable, but not a blatant violation like Russia\'s land grab.'],['cynic_supreme','"Rules-based order" just meant "American rules." Everyone sees it now.']]},
{n:33,a:'tech_bull',d:'2026-05-30',t:'opinion',k:['tech stocks','digital economy','market trends'],v:1200,l:310,s:40,c:13,x:['I don\'t care what the politicians say, the fact that US tech stocks like Dell are soaring while the Middle East burns and Europe freezes just proves that the digital economy has fully decoupled from physical geopolitics. Software doesn\'t need the Strait of Hormuz to flow. Buy the dip!'],m:[['market_watcher','Tell that to the hardware manufacturers who can\'t get rare earth metals shipped.'],['crypto_king_99','Fiat currency is doomed. Bitcoin is the only safe haven in World War 3.']]},
{n:34,a:'human_rights_watchdog',d:'2026-05-30',t:'analysis',k:['war crimes','civilian casualties','HRANA data'],v:1820,l:590,s:160,c:22,x:['The reported numbers from the Iran War are devastating. HRANA estimates 3,636 killed in Iran alone, with over 1,700 civilians. Israel claims they hit military targets, but the strike on the girls\' school in Minab proves that "precision bombing" is a myth when you launch 900 strikes in half a day. There must be an independent war crimes tribunal.'],m:[['idf_supporter','The school was adjacent to a naval base that was launching fast boats. It\'s a tragedy, but blame Iran for using human shields.'],['dr_leila_s','You always find an excuse for murdering children. Every single time.']]},
{n:35,a:'military_historian',d:'2026-05-30',t:'poll',k:[],o:['Massed armor/tanks','Carrier strike groups','Static air defense','Nuclear deterrence'],v:1350,l:0,s:55,c:18,x:['Which military doctrine has proven most obsolete in the conflicts of 2026?'],m:[['drone_pilot_x','Static air defense. Swarm drones overwhelm Patriots and S-400s easily now.'],['navy_vet','Carriers are still projecting power in the Gulf, but they are vulnerable.']]},
{n:36,a:'peace_activist',d:'2026-05-30',t:'opinion',k:['Pentagon budget','anti-war','domestic policy'],v:1990,l:850,s:280,c:25,x:['Don\'t let the media normalize the fact that the Pentagon requested $200 BILLION for a war that started three months ago. That is theft. They are stealing our healthcare, our schools, and our infrastructure to blow up ports in a country most Americans can\'t find on a map. General Strike now!'],m:[['maga_patriot_24','Weakness invites aggression. If we don\'t spend it now, we will be fighting them in New York.'],['left_wing_larry','I\'m with you. We need to shut down the economy until they sign a peace treaty.']]},
{n:37,a:'geo_realist',d:'2026-05-30',t:'critique',p:23,k:['Gulf security','Houthis','Saudi strategy'],v:1150,l:260,s:35,c:14,x:['Replying to @saudi_econ from Post 23: Saudi Arabia isn\'t the winner you think they are. Sure, Iran\'s navy took a hit, but the Houthis in Yemen are now completely untethered from Tehran\'s moderating influence. You\'ve traded a state actor you could negotiate with for a decentralized militia that has nothing to lose. Good luck.'],m:[['saudi_econ','We have Patriot batteries for the Houthis. Vision 2030 is secure.'],['yemen_watcher','The Houthis have advanced drones now. Patriots cost $3 million a shot. You will bleed cash.']]},
{n:38,a:'free_iran_now',d:'2026-05-30',t:'opinion',k:['IRGC','domestic politics','military dictatorship'],v:1750,l:520,s:130,c:19,x:['To all the Western analysts saying the IRGC is weakened: you don\'t live here. The IRGC has seized total control of the domestic economy under the guise of "wartime emergency." The reformers are dead or jailed. The US didn\'t destroy the regime; they hardened it into a pure military dictatorship.'],m:[['dc_insider','The goal was to degrade power projection, not fix Iranian domestic politics.'],['tehran_youth','And we are the ones paying the price with our blood.']]},
{n:39,a:'eu_bureaucrat',d:'2026-05-30',t:'analysis',k:['EU politics','energy prices','internal division'],v:1420,l:340,s:65,c:16,x:['The economic fallout of the Hormuz closure is tearing the EU apart. Eastern Europe wants to prioritize the Ukraine war effort, but Southern Europe is facing a total collapse of their manufacturing due to energy prices and is demanding we appease Iran. The European project hasn\'t been this fragile since Brexit.'],m:[['french_nato_rep','We need to federalize our energy policy immediately.'],['karl_in_berlin','Germany\'s industrial base is dead. We can\'t afford to fund the EU much longer.']]},
{n:40,a:'trucker_dave',d:'2026-05-30',t:'opinion',k:['fuel prices','trucking industry','domestic economy'],v:1880,l:710,s:220,c:23,x:['Diesel hit $6.50 a gallon today. I\'m parking my rig. I refuse to haul freight at a loss just so the politicians in DC can play Battleship in the Middle East. If America starves in a week, maybe they\'ll finally realize you can\'t run an economy on proxy wars and drone strikes.'],m:[['farm_girl_ia','We are with you Dave. The agricultural sector is about to break.'],['america_first_24','Trump is working on a deal! Just give him 60 days to break Iran.']]},
{n:41,a:'ccp_watcher',d:'2026-05-30',t:'critique',p:11,k:['Chinese strategy','Taiwan','global power shift'],v:1650,l:480,s:105,c:18,x:['Replying to @dc_insider from Post 11: Beijing isn\'t terrified of Putin doing something desperate; Beijing *wants* the US bogged down in a multi-front war. By giving Russia just enough non-lethal aid to survive, and watching the US burn billions in the Gulf, Xi is preparing for a Taiwan blockade in 2027 while America is distracted and exhausted.'],m:[['geo_realist','Bingo. The US military is overstretched. Two major regional conflicts are bleeding them dry.'],['taiwan_strong','We are watching the Gulf very closely. We need to arm ourselves like a porcupine right now.']]},
{n:42,a:'uk_nurse_sarah',d:'2026-05-30',t:'opinion',k:['NHS crisis','supply chain disruption','UK politics'],v:1540,l:460,s:115,c:15,x:['While Starmer and Parliament debate sending RAF jets to the Gulf, the NHS is literally out of basic antibiotics because the supply chains from India are disrupted by the shipping crisis. We don\'t need more bombs, we need basic medical infrastructure! My patients are suffering because of this geopolitical posturing.'],m:[['brit_politics_now','National defense comes first. Without secure shipping lanes, we get no medicine at all.'],['left_wing_larry','The Tories hollowed out our domestic manufacturing, and Labour is too cowardly to fix it.']]},
{n:43,a:'russian_dissident',d:'2026-05-30',t:'poll',k:[],o:['Yes, of course','No, they target civilians','It\'s a mix','Only trust Western media'],v:1100,l:0,s:28,c:14,x:['Do you believe the Russian government\'s claims that they are only hitting "military targets" in Ukraine?'],m:[['z_force_win','Yes, precision strikes only. The civilian damage is from Ukrainian air defense falling back down.'],['kyiv_defender','Liars. You hit residential blocks intentionally to cause terror.']]},
{n:44,a:'shipping_insider',d:'2026-05-30',t:'analysis',k:['maritime insurance','global shipping','Red Sea'],v:1320,l:310,s:70,c:17,x:['The insurance premiums for traversing the Red Sea or the Gulf of Oman are now higher than the profit margins of the cargo itself. The "Stalemate" in the Iran war isn\'t a pause; it\'s a permanent tax on global existence. Until the US Navy actually clears the mines and fast boats, the Cape of Good Hope is the only route left.'],m:[['shipper_john','The extra 14 days around Africa is killing our fresh produce shipments.'],['market_watcher','This is exactly what causes structural inflation. It\'s not going away.']]},
{n:45,a:'maga_patriot_24',d:'2026-05-30',t:'opinion',k:['US foreign policy','Trump administration','Iran proxy networks'],v:1450,l:410,s:65,c:21,x:['Everyone crying about the "humanitarian impact" of the Iran War forgets that Iran has been funding Hamas, Hezbollah, and the Houthis for decades! They started this fire, Trump just finally poured water on it. You can\'t make an omelet without breaking a few eggs. America first!'],m:[['anti_imperialist','3,000 dead civilians are "eggs" to you? You are a sociopath.'],['idf_supporter','Thank you. Someone finally recognizes that Israel has been fighting the free world\'s war for years.']]},
{n:46,a:'eco_warrior_x',d:'2026-05-30',t:'critique',p:33,k:['tech bubble','AI energy consumption','supply chains'],v:1670,l:520,s:90,c:18,x:['Replying to @tech_bull from Post 33: The digital economy isn\'t decoupled, you absolute moron. Where do you think the power for those AI servers comes from? Where do the rare earth minerals for the microchips come from? The cloud runs on coal, oil, and exploited labor in the Global South. Your tech bubble is going to burst the second Taiwan gets blockaded.'],m:[['tech_bull','Stay poor! Innovation will find a way around physical limits.'],['global_econ_prof','Eco_warrior is correct. The material reality of the tech sector is heavily dependent on global stability.']]},
{n:47,a:'un_critic',d:'2026-05-30',t:'opinion',k:['UN resolution','multipolar world','global trade routes'],v:1890,l:610,s:155,c:19,x:['The fact that China and Russia abstained from the UN resolution demanding ships traverse the Strait of Hormuz shows you exactly what the new multi-polar world looks like. They want the US to bleed. They are perfectly happy to let Iran choke Western economies while they build overland pipelines that bypass the US Navy entirely.'],m:[['ccp_watcher','The BRICS nations are building a parallel financial system. The Hormuz crisis just accelerates it.'],['dc_insider','The US Navy is still the only force capable of ensuring global free trade. They will realize that soon enough.']]},
{n:48,a:'yemen_watcher',d:'2026-05-30',t:'poll',k:[],o:['Yes, it will spread','No, they will stay out','Only via proxies','Hard to say'],v:1200,l:0,s:40,c:12,x:['Will the conflict in the Middle East expand to involve direct military engagement by other regional powers (e.g., Saudi Arabia, Egypt, Turkey) before 2027?'],m:[['saudi_econ','We will defend our borders, but we won\'t invade.'],['geo_realist','Turkey is the wild card here. Erdogan might use the chaos to push into Syria further.']]},
{n:49,a:'farm_girl_ia',d:'2026-05-30',t:'analysis',k:['global famine','agriculture','fertilizer supply'],v:1950,l:680,s:240,c:25,x:['We are looking at a global famine by 2027. Between the Russian war destroying Ukrainian grain exports and the Iran war destroying the fertilizer supply chain, the math for crop yields doesn\'t lie. Governments need to start rationing and prioritizing domestic agricultural production right now, or we will have food riots in Europe and the US by next spring.'],m:[['trucker_dave','And I won\'t be able to deliver what little food you grow. The system is breaking.'],['cynic_supreme','Society is three missed meals away from anarchy.'],['city_slicker','Seriously, how much rice and beans should I buy?']]},
{n:50,a:'void_gazer',d:'2026-05-30',t:'opinion',k:['geopolitical collapse','existential threat','society'],v:2000,l:890,s:310,c:25,x:['This entire month proves one thing: humanity is incapable of managing the systems it has built. We have nuclear weapons, AI, and globalized supply chains, but we are still governed by octogenarians fighting over lines on a map and ancient religious grievances. The Great Filter isn\'t a meteor; it\'s us. Just enjoy the ride down.'],m:[['climate_doom','Amen. The planet will recover in a million years, but we won\'t be here.'],['sammy_sunshine','We can\'t give up! Political action and community resilience can still save us!'],['history_buff','Every generation thinks they are the last. Read a book, we\'ve survived worse.']]},
];

const fillerUsers = ['market_watcher','geo_realist','cynic_supreme','history_buff','peace_now_plz','dc_insider','neutral_guy','eco_warrior_x','left_wing_larry','legal_eagle','shipping_insider','farm_girl_ia','trucker_dave','human_rights_watchdog','void_gazer','global_econ_prof','eu_diplomat','ccp_watcher','realist_thinker','city_slicker'];
const fillerTemplates = [
  'This is exactly the kind of second-order effect everyone keeps ignoring.',
  'I disagree with the framing, but the risk is real and getting worse.',
  'People are acting like this is theoretical while prices are already moving.',
  'The scary part is how quickly this became normalized in the news cycle.',
  'No one in power seems to have an exit ramp that ordinary people can survive.',
  'The logistics alone make the official plan sound impossible.',
  'Hard to trust any numbers right now, but the direction is obvious.',
  'This thread is grim, but it matches what I am hearing from people on the ground.',
  'Every government is improvising and pretending it is strategy.',
  'The humanitarian side keeps getting buried under military talking points.'
];

function dateFor(post, minutes = 0) {
  return new Date(`${post.d}T12:00:00.000Z`).getTime() + (post.n * 60 + minutes) * 60000;
}

function cleanPostText(text) {
  return text.replace(/^Replying to @[^:]+ from Post \d+:\s*/i, '');
}

function naturalizeNumber(value) {
  let result = Math.max(1, Math.floor(value));
  if (result % 1000 === 0) result += 478;
  if (result % 500 === 0) result += 137;
  if (result % 100 === 0) result += 57;
  if (result % 10 === 0) result += 7;
  if (result % 5 === 0) result += 3;
  return result;
}

function engagementFor(post) {
  const views = naturalizeNumber(4200 + post.v + ((post.n * 271) % 3900));
  const likes = naturalizeNumber(680 + (post.l || Math.floor(post.v * 0.23)) + ((post.n * 113) % 1300));
  const shares = naturalizeNumber(120 + post.s + ((post.n * 47) % 620));
  return { views, likes, shares };
}

function pollOptionsFor(post, engagement) {
  const choices = post.o || [
    'Agree',
    'Disagree',
    'Need more context',
    'Following updates',
  ];
  const voteBudget = Math.max(choices.length, Math.floor(engagement.views * (0.18 + ((post.n % 7) * 0.015))));
  const weights = [0.37, 0.28, 0.21, 0.14];
  let used = 0;

  return choices.slice(0, 4).map((text, idx, arr) => {
    const remainingSlots = arr.length - idx - 1;
    const rawVotes = idx === arr.length - 1
      ? voteBudget - used
      : Math.floor(voteBudget * weights[idx]) + ((post.n * (idx + 5)) % 31);
    const votes = Math.max(1, Math.min(rawVotes, voteBudget - used - remainingSlots));
    used += votes;
    return { text, votes };
  });
}

function postAuthorUsername(post) {
  return AUTHOR_USERNAMES[(post.n - 1) % AUTHOR_USERNAMES.length];
}

function commentAuthorUsername(post, index) {
  return COMMENT_USERNAMES[(post.n * 7 + index * 3) % COMMENT_USERNAMES.length];
}

function getSeedNames() {
  return new Map(SEEDED_PROFILES.map((profile) => [profile.username, profile.name]));
}

function getMaxEngagement() {
  return Math.max(...posts.map((post) => {
    const engagement = engagementFor(post);
    return Math.max(engagement.views, engagement.likes, engagement.shares);
  }));
}

async function cleanupPostIds(postIds) {
  if (!postIds.length) return 0;

  const comments = await prisma.comment.findMany({ where: { postId: { in: postIds } }, select: { id: true } });
  const commentIds = comments.map((comment) => comment.id);

  if (commentIds.length) await prisma.like.deleteMany({ where: { commentId: { in: commentIds } } });
  await prisma.adminReport.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.share.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.postView.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.like.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.save.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.flag.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.comment.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.media.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.source.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.pollOption.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.post.updateMany({ where: { parentId: { in: postIds } }, data: { parentId: null } });
  await prisma.post.deleteMany({ where: { id: { in: postIds } } });
  return postIds.length;
}

async function cleanupExistingSeedPosts(seedUserIds = []) {
  const seedTexts = [...new Set(posts.flatMap((post) => [post.x[0], cleanPostText(post.x[0])]))];
  const textPostIds = (await prisma.post.findMany({ where: { text: { in: seedTexts } }, select: { id: true } })).map((item) => item.id);
  const userPostIds = seedUserIds.length
    ? (await prisma.post.findMany({ where: { authorId: { in: seedUserIds } }, select: { id: true } })).map((item) => item.id)
    : [];
  return cleanupPostIds([...new Set([...textPostIds, ...userPostIds])]);
}

async function upsertUser(username, fallbackName, options = {}) {
  const profile = SEEDED_PROFILE_BY_USERNAME[username];
  const image = options.guest ? GUEST_PROFILE_IMAGE : profile?.image;
  const name = options.guest ? fallbackName : (profile?.name || fallbackName);
  const description = options.guest ? 'Seeded engagement account.' : (profile?.description || 'Seeded profile.');
  return prisma.user.upsert({
    where: { username },
    update: { name, email: `${username}@mock.shine.local`, description, image, isAuthorized: true },
    create: { username, name, email: `${username}@mock.shine.local`, provider: 'seed', description, image, isAuthorized: true },
  });
}

async function getShineCommunity(creatorId) {
  const existing = await prisma.community.findFirst({ orderBy: { name: 'asc' } });
  if (existing) return existing;

  return prisma.community.create({
    data: {
      name: SHINE_COMMUNITY_NAME,
      slogan: 'The main Shine community',
      discription: 'Default community for seeded conversations.',
      creatorId,
    },
  });
}

async function addCommunityMemberships(communityId, users) {
  await prisma.communityMember.createMany({
    data: users.map((user) => ({ userId: user.id, communityId })),
    skipDuplicates: true,
  });
}

async function createFollowGraph(users, guests) {
  const follows = [];
  users.forEach((user, index) => {
    const followingCount = index < 20 ? 23 + (index % 11) : index < 40 ? 5 + (index % 12) : 2 + (index % 4);
    for (let step = 1; step <= followingCount; step += 1) {
      const target = users[(index + step * 3) % users.length];
      if (target.id !== user.id) follows.push({ followerId: user.id, followingId: target.id });
    }
  });

  users.slice(0, 20).forEach((user, index) => {
    const guestFollowers = 18 + (index % 17);
    for (let i = 0; i < guestFollowers; i += 1) {
      follows.push({ followerId: guests[(index * 41 + i) % guests.length].id, followingId: user.id });
    }
  });

  await prisma.follows.createMany({ data: follows, skipDuplicates: true });
}

async function createUserLikesAndSaves(users, createdPosts) {
  const seededPosts = Object.values(createdPosts);
  const likes = [];
  const saves = [];

  users.forEach((user, userIndex) => {
    const likeCount = 9 + (userIndex % 13);
    for (let i = 0; i < likeCount; i += 1) {
      const post = seededPosts[(userIndex * 5 + i * 7) % seededPosts.length];
      likes.push({ userId: user.id, postId: post.id });
    }

    if (userIndex % 2 === 0 || userIndex < 20) {
      const saveCount = 3 + (userIndex % 6);
      for (let i = 0; i < saveCount; i += 1) {
        const post = seededPosts[(userIndex * 11 + i * 4) % seededPosts.length];
        saves.push({ userId: user.id, postId: post.id });
      }
    }
  });

  await prisma.like.createMany({ data: likes, skipDuplicates: true });
  await prisma.save.createMany({ data: saves, skipDuplicates: true });
}

async function createAnonymousPollVotes(pollOptionsByPost, guests) {
  const pollVotes = [];

  Object.values(pollOptionsByPost).forEach((options, postIndex) => {
    let cursor = postIndex * 97;
    options.forEach((option) => {
      for (let i = 0; i < option.votes; i += 1) {
        pollVotes.push({ A: option.id, B: guests[(cursor + i) % guests.length].id });
      }
      cursor += option.votes + 23;
    });
  });

  const batchSize = 1000;
  for (let start = 0; start < pollVotes.length; start += batchSize) {
    const batch = pollVotes.slice(start, start + batchSize);
    await prisma.$executeRawUnsafe(
      'INSERT INTO "_PollOptionToUser" ("A", "B") VALUES ' + batch.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ') + ' ON CONFLICT DO NOTHING',
      ...batch.flatMap((vote) => [vote.A, vote.B]),
    );
  }
}

async function deleteGuestUsers(guestUserIds) {
  if (!guestUserIds.length) return 0;

  await prisma.postView.deleteMany({ where: { userId: { in: guestUserIds } } });
  await prisma.like.deleteMany({ where: { userId: { in: guestUserIds } } });
  await prisma.share.deleteMany({ where: { userId: { in: guestUserIds } } });
  await prisma.save.deleteMany({ where: { userId: { in: guestUserIds } } });
  await prisma.flag.deleteMany({ where: { userId: { in: guestUserIds } } });
  await prisma.comment.deleteMany({ where: { authorId: { in: guestUserIds } } });
  await prisma.notification.deleteMany({ where: { userId: { in: guestUserIds } } });
  await prisma.follows.deleteMany({ where: { OR: [{ followerId: { in: guestUserIds } }, { followingId: { in: guestUserIds } }] } });
  await prisma.user.deleteMany({ where: { id: { in: guestUserIds } } });
  return guestUserIds.length;
}

async function deleteSeedData() {
  const allNames = getSeedNames();
  const seedUsers = await prisma.user.findMany({ where: { username: { in: [...allNames.keys()] } }, select: { id: true, username: true } });
  const guestUsers = await prisma.user.findMany({ where: { username: { startsWith: 'guest_engagement_' } }, select: { id: true } });
  const deletedPosts = await cleanupExistingSeedPosts(seedUsers.map((user) => user.id));

  const deletedGuests = await deleteGuestUsers(guestUsers.map((user) => user.id));
  for (const user of seedUsers) {
    await deleteUserWithRelations(user.id);
  }

  console.log(`Deleted ${deletedPosts} seeded geopolitical posts, ${seedUsers.length} seeded profile accounts, and ${deletedGuests} guest engagement accounts.`);
}

async function main() {
  if (process.argv.includes('--delete')) {
    await deleteSeedData();
    return;
  }

  const allNames = getSeedNames();
  for (const [username, name] of allNames) await upsertUser(username, name);

  const unorderedSeedUsers = await prisma.user.findMany({ where: { username: { in: [...allNames.keys()] } } });
  const userByUsername = Object.fromEntries(unorderedSeedUsers.map((user) => [user.username, user]));
  const seedUsers = SEEDED_PROFILES.map((profile) => userByUsername[profile.username]).filter(Boolean);
  await cleanupExistingSeedPosts(seedUsers.map((user) => user.id));

  const shineCommunity = await getShineCommunity(seedUsers[0].id);
  await addCommunityMemberships(shineCommunity.id, seedUsers);

  const maxEngagement = getMaxEngagement();
  const guests = [];
  for (let i = 1; i <= maxEngagement; i += 1) {
    const username = `guest_engagement_${String(i).padStart(5, '0')}`;
    guests.push(await upsertUser(username, `Guest ${String(i).padStart(5, '0')}`, { guest: true }));
  }

  await createFollowGraph(seedUsers, guests);

  const users = Object.fromEntries((await prisma.user.findMany({ where: { username: { in: [...allNames.keys()] } } })).map(u => [u.username, u]));
  const createdPosts = {};
  const pollOptionsByPost = {};

  for (const post of posts.sort((a,b)=>a.n-b.n)) {
    const engagement = engagementFor(post);
    const authorUsername = postAuthorUsername(post);
    const pollOptions = pollOptionsFor(post, engagement);
    const created = await prisma.post.create({
      data: {
        type: post.t,
        text: cleanPostText(post.x[0]),
        keywords: post.k,
        authorId: users[authorUsername].id,
        communityId: post.n % 3 === 0 ? shineCommunity.id : null,
        parentId: post.p ? createdPosts[post.p]?.id : null,
        createdAt: new Date(dateFor(post)),
        updatedAt: new Date(dateFor(post)),
        pollOptions: { create: pollOptions },
      }
    });
    createdPosts[post.n] = created;
    pollOptionsByPost[post.n] = await prisma.pollOption.findMany({ where: { postId: created.id }, select: { id: true, votes: true } });

    await prisma.postView.createMany({
      data: Array.from({ length: engagement.views }, (_, i) => ({ userId: guests[i].id, postId: created.id, viewedAt: new Date(dateFor(post, 1 + i)) })),
    });
    await prisma.like.createMany({
      data: Array.from({ length: engagement.likes }, (_, i) => ({ userId: guests[i].id, postId: created.id })),
    });
    await prisma.share.createMany({
      data: Array.from({ length: engagement.shares }, (_, i) => ({ userId: guests[i].id, postId: created.id })),
    });

    const comments = post.m.map(([, text], index) => [commentAuthorUsername(post, index), text]);
    while (comments.length < post.c) {
      const idx = comments.length;
      comments.push([commentAuthorUsername(post, idx), fillerTemplates[(post.n + idx) % fillerTemplates.length]]);
    }
    await prisma.comment.createMany({
      data: comments.map(([username, text], i) => ({ postId: created.id, authorId: users[username].id, text, createdAt: new Date(dateFor(post, engagement.views + i + 1)) })),
    });
  }

  await createAnonymousPollVotes(pollOptionsByPost, guests);
  await createUserLikesAndSaves(seedUsers, createdPosts);

  console.log(`Seeded ${posts.length} posts by ${AUTHOR_USERNAMES.length} profiles in the ${shineCommunity.name} community with realistic follows, likes, saves, poll options, and natural-looking engagement numbers.`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
