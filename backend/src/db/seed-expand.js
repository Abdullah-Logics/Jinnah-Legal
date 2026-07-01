import { v4 as uuid } from 'uuid';
import { run, queryOne } from './adapter.js';

const FIRST = [
  'Muhammad','Ahmed','Ali','Hassan','Hussain','Omar','Usman','Bilal','Hamza','Zaid',
  'Tariq','Imran','Khalid','Naveed','Asad','Fahad','Sohail','Kamran','Javed','Arslan',
  'Aamir','Waqar','Farhan','Shahid','Rashid','Adeel','Tanveer','Iqbal','Junaid','Noman',
  'Shahbaz','Akbar','Sajid','Riaz','Shafiq','Mansoor','Saeed','Adnan','Zubair','Yasir',
  'Ahmad','Faisal','Hammad','Nadeem','Qaiser','Rizwan','Shabbir','Tahir','Zafar','Aftab',
  'Muneer','Ibrahim','Ismail','Yahya','Ayub','Azhar','Bashir','Danish','Ehsan','Ghulam',
  'Habib','Irshad','Jabbar','Liaqat','Maqbool','Nasir','Pervaiz','Rafiq','Saleem','Sultan',
  'Yousaf','Zia','Naseem','Ashraf','Anwar','Akram','Shamsher','Tasleem','Wajid','Sardar',
  'Rehmat','Qadir','Parvez','Naeem','Latif','Kaleem','Jaleel','Hameed','Gulzar','Feroz',
  'Ejaz','Dildar','Burhan','Asif','Aqeel','Anjum','Aijaz','Waqas','Shehzad','Mazhar',
  'Israr','Iftikhar','Hafeez','Farooq','Ehtisham','Aziz','Atif','Arif',
];

const LAST = [
  'Khan','Ahmed','Ali','Hussain','Malik','Sheikh','Siddiqui','Butt','Qureshi','Hashmi',
  'Iqbal','Chaudhry','Shah','Mirza','Rana','Bhatti','Gill','Khattak','Durrani','Tanoli',
  'Mughal','Awan','Jatoi','Memon','Syed','Rizvi','Bukhari','Gilani','Naqvi','Zaidi',
  'Jilani','Ansari','Farooqi','Usmani','Alvi','Abbasi','Kazmi','Sultani','Shinwari','Afridi',
  'Mohmand','Orakzai','Kiyani','Gardezi','Qazi','Mazari','Leghari','Talpur','Khoso','Chandio',
  'Bhutto','Magsi','Dasti','Chishti','Suhrawardi','Khalid','Niazi','Lodhi','Ghauri','Tareen',
  'Kakar','Tarin','Jogezai','Mengal','Zehri','Shafiq','Sattar','Waheed','Nasir','Latif',
];

const FEMALE = [
  'Fatima','Ayesha','Zahida','Nasreen','Khadija','Sania','Bushra','Saima','Nadia','Farzana',
  'Shamim','Zubaida','Tahira','Naheed','Yasmeen','Shahnaz','Parveen','Rashida','Sakina','Kausar',
  'Zainab','Hajra','Asma','Rubina','Nargis','Shabnam','Kishwar','Rahat','Sughran','Bilqis',
  'Amina','Kulsoom','Samina','Shazia','Riffat','Qaisra','Noreen','Farkhanda','Abida','Nusrat',
];

const DISTRICTS = [
  'Karachi','Lahore','Islamabad','Peshawar','Quetta','Multan','Faisalabad','Rawalpindi',
  'Sialkot','Gujranwala','Hyderabad','Sukkur','Sargodha','Bahawalpur','Sahiwal','Gujrat',
  'Jhelum','Mardan','Kohat','Abbottabad','Swat','Dera Ismail Khan','Bannu','Chaman','Turbat',
  'Gwadar','Khuzdar','Larkana','Nawabshah','Mirpurkhas','Dadu','Badin','Thatta','Kasur',
  'Okara','Pakpattan','Vehari','Muzaffargarh','Dera Ghazi Khan','Rajanpur','Layyah','Bhakkar',
  'Khushab','Mianwali','Attock','Chakwal','Narowal','Hafizabad','Toba Tek Singh','Jhang',
];

const CATEGORIES = [
  'Criminal','Civil','Constitutional','Banking','Corporate','Service','Family','Tax','Property','Contract','Tort',
];

const REPORTERS_MAP = {
  Criminal: ['PCrLJ','SCMR','PLD'],
  Civil: ['CLC','YLR','PLD'],
  Constitutional: ['PLD','SCMR','PTD'],
  Banking: ['CLC','YLR','PLD'],
  Corporate: ['CLC','YLR','PLD'],
  Service: ['SCMR','PLD','YLR'],
  Family: ['MLD','YLR','PLD'],
  Tax: ['PTD','YLR','PLD'],
  Property: ['CLC','PLD','YLR'],
  Contract: ['CLC','YLR','PLD'],
  Tort: ['CLC','YLR','PLD'],
};

const STATUTES_MAP = {
  Criminal: [
    'PPC 302, 324, 337, CrPC 1973',
    'PPC 307, 324, CrPC 497',
    'PPC 395, 397, 412, CrPC 1973',
    'PPC 354, 509, 510, CrPC 1973',
    'PPC 376, 377, Qanun-e-Shahadat 1984',
    'PPC 420, 467, 468, 471, CrPC 1973',
    'CNSA 1997 Sections 9, 12, 14, 15',
    'PPC 302, 309, 310, 311, CrPC 1973',
    'PPC 295-B, 295-C, 296, CrPC 1973',
    'PPC 332, 333, 337-A, CrPC 1973',
    'PPC 489-F, 489-D, CrPC 1973',
    'PPC 378, 379, 380, 381, CrPC 1973',
    'PPC 362, 363, 364, 365-B, CrPC 1973',
    'PPC 498-A, 498-B, 498-C, CrPC 1973',
    'PPC 419, 420, 421, 422, CrPC 1973',
    'PPC 324, 325, 326, 327, CrPC 1973',
    'PPC 336, 337, 338, CrPC 1973',
    'PPC 442, 443, 444, 445, 446, CrPC 1973',
    'PPC 503, 504, 506, 507, CrPC 1973',
    'PPC 201, 202, 203, CrPC 1973',
  ],
  Civil: [
    'Specific Relief Act 1877, Sections 9, 42, 54',
    'Civil Procedure Code 1908, Sections 9, 151, O 7 R 11',
    'Limitation Act 1908, Articles 120, 142, 144',
    'Contract Act 1872, Sections 10, 23, 56, 73',
    'Transfer of Property Act 1882, Sections 52, 53, 54, 105',
    'Registration Act 1908, Sections 17, 49, 55',
    'Civil Procedure Code 1908, O 39 R 1, 2, Section 151',
    'Specific Relief Act 1877, Sections 8, 9, 55',
    'Limitation Act 1908, Articles 56, 57, 58, 59',
    'Contract Act 1872, Sections 65, 70, 72, 73, 74',
    'Transfer of Property Act 1882, Sections 100, 105, 106, 108',
    'Civil Procedure Code 1908, Sections 10, 11, 12',
    'Partition Act 1893, Sections 2, 3, 4, 6',
    'Succession Act 1925, Sections 30, 31, 32, 33, 34',
  ],
  Constitutional: [
    'Articles 184(3), 199, 185, Constitution of Pakistan 1973',
    'Articles 8, 9, 10, 10-A, 14, 25, Constitution of Pakistan 1973',
    'Articles 62, 63, 184(3), Elections Act 2017',
    'Articles 199, 185, 184(3), Constitution of Pakistan 1973',
    'Articles 23, 24, 184(3), 199, Constitution of Pakistan 1973',
    'Articles 18, 19, 19-A, 199, Constitution of Pakistan 1973',
    'Articles 15, 16, 17, 199, Constitution of Pakistan 1973',
    'Articles 4, 5, 6, 199, Constitution of Pakistan 1973',
    'Articles 7, 8, 199, 184(3), Constitution of Pakistan 1973',
    'Articles 25, 27, 35, 37, Constitution of Pakistan 1973',
    'Articles 38, 39, 184(3), Constitution of Pakistan 1973',
    'Articles 175, 185, 186, Constitution of Pakistan 1973',
    'Articles 213, 214, 218, Constitution of Pakistan 1973',
    'Articles 243, 244, 245, 199, Constitution of Pakistan 1973',
    'Articles 270-AA, 270-BBB, Constitution of Pakistan 1973',
  ],
  Banking: [
    'Banking Companies Ordinance 1962, Sections 21, 22, 25',
    'Financial Institutions (Recovery) Act 1997, Sections 5, 6, 15',
    'State Bank of Pakistan Act 1956, Sections 17, 22, 26',
    'Negotiable Instruments Act 1881, Sections 138, 139, 140, 141',
    'Financial Institutions (Recovery) Ordinance 2001, Sections 3, 4, 9',
    'Banking Companies Ordinance 1962, Sections 36, 37, 38',
    'Companies Act 2017, Sections 213, 214, 215',
    'Securities and Exchange Commission of Pakistan Act 1997',
    'Money Lenders Ordinance 1960, Sections 3, 4, 5',
    'Banking Tribunal Ordinance 1984, Sections 3, 4, 12',
  ],
  Corporate: [
    'Companies Act 2017, Sections 2, 4, 5, 6, 7',
    'Companies Act 2017, Sections 159, 160, 161, 162',
    'Companies Act 2017, Sections 196, 197, 198, 204',
    'Partnership Act 1932, Sections 4, 5, 6, 7, 40, 41',
    'Contract Act 1872, Sections 23, 24, 25, 26, 27',
    'Companies Act 2017, Sections 220, 221, 222, 224',
    'SECP Act 1997, Sections 13, 14, 15, 16',
    'Competition Act 2010, Sections 3, 4, 5, 6, 7',
    'Companies Act 2017, Sections 290, 291, 292, 293',
  ],
  Service: [
    'Civil Servants Act 1973, Sections 4, 8, 9, 10, 11',
    'Civil Servants Act 1973, Sections 12, 13, 14, 16',
    'Civil Servants Act 1973, Sections 17, 18, 19, 20, 21',
    'Punjab Civil Servants Act 1974, Sections 5, 6, 7, 8',
    'Service Tribunals Act 1973, Sections 3, 4, 5, 14',
    'Civil Servants (Efficiency and Discipline) Rules',
    'Civil Servants (Promotion) Rules',
    'Pension Rules, GP Fund Rules, Gratuity Rules',
  ],
  Family: [
    'Muslim Family Laws Ordinance 1961, Sections 4, 5, 6, 7, 8',
    'Muslim Family Laws Ordinance 1961, Sections 9, 10, 11, 12, 13',
    'Family Courts Act 1964, Sections 3, 4, 5, 12, 14, 17',
    'Guardians and Wards Act 1890, Sections 7, 8, 17, 25',
    'Dissolution of Muslim Marriages Act 1939, Sections 2, 3, 4, 5',
    'Prevention of Domestic Violence Act 2012',
  ],
  Tax: [
    'Income Tax Ordinance 2001, Sections 4, 5, 11, 12, 13',
    'Income Tax Ordinance 2001, Sections 21, 22, 23, 24, 31',
    'Sales Tax Act 1990, Sections 3, 6, 7, 8, 10, 11',
    'Federal Excise Act 2005, Sections 3, 4, 5, 6, 7',
    'Customs Act 1969, Sections 2, 18, 19, 25, 32, 80',
    'Income Tax Ordinance 2001, Sections 111, 112, 113, 114',
    'Sales Tax Act 1990, Sections 22, 23, 24, 25, 26',
    'Income Tax Ordinance 2001, Sections 133, 134, 135',
  ],
  Property: [
    'Transfer of Property Act 1882, Sections 54, 55, 58, 105, 108',
    'Transfer of Property Act 1882, Sections 43, 51, 52, 53, 53A',
    'Registration Act 1908, Sections 17, 18, 49, 50',
    'Land Revenue Act 1967, Sections 3, 4, 5, 40, 42',
    'Specific Relief Act 1877, Sections 9, 42, 54',
    'Succession Act 1925, Sections 30, 31, 57, 58',
    'Land Acquisition Act 1894, Sections 4, 5, 6, 17, 23',
  ],
  Contract: [
    'Contract Act 1872, Sections 2, 4, 5, 10, 11, 12, 13',
    'Contract Act 1872, Sections 14, 15, 16, 17, 18, 19, 20',
    'Contract Act 1872, Sections 23, 24, 25, 26, 27, 28, 29',
    'Contract Act 1872, Sections 55, 56, 57, 62, 63, 64, 65',
    'Contract Act 1872, Sections 67, 68, 69, 70, 71, 72, 73',
    'Contract Act 1872, Sections 124, 125, 126, 127, 128, 129',
    'Contract Act 1872, Sections 148, 149, 150, 151, 152, 153',
    'Contract Act 1872, Sections 172, 173, 174, 175, 176, 177',
    'Contract Act 1872, Sections 182, 183, 184, 185, 186, 187',
  ],
  Tort: [
    'Fatal Accidents Act 1855, Sections 1, 2, 3',
    'Motor Vehicles Ordinance 1965, Sections 89, 90, 91, 92',
    'Workmen\'s Compensation Act 1923, Sections 3, 4, 5, 10',
    'Railways Act 1890, Sections 80, 81, 82, 82-A',
    'Defamation Ordinance 2002, Sections 3, 4, 5, 6, 7',
    'Specific Relief Act 1877, Section 54',
  ],
};

const KEYWORDS_MAP = {
  Criminal: [
    'bail, criminal procedure, PPC, post-arrest',
    'murder, qatl-e-amd, evidence, eyewitness',
    'dacoity, robbery, identification, recovery',
    'assault, gender-based violence, evidence',
    'rape, Zina, Qanun-e-Shahadat, forensic',
    'fraud, forgery, cheating, documentary evidence',
    'narcotics, CNSA, commercial quantity, sentencing',
    'qisas, diyat, compromise, composition',
    'blasphemy, religious tolerance, evidence',
    'hurt, injury, medical evidence, compensation',
    'dishonour of cheque, banking, financial fraud',
    'theft, burglary, criminal trespass',
    'kidnapping, abduction, minor, recovery',
    'dowry, domestic violence, family, cruelty',
    'attempted murder, dangerous weapons',
    'criminal intimidation, threat, extortion',
    'false evidence, perjury, obstruction',
  ],
  Civil: [
    'specific performance, contract, property',
    'civil procedure, limitation, jurisdiction',
    'limitation, time-barred, dismissal',
    'breach of contract, damages',
    'property transfer, sale deed, title',
    'registration, unregistered document',
    'burden of proof, evidence, onus',
    'temporary injunction, property dispute',
    'possession, ownership, title suit',
    'adverse possession, ouster, title',
    'restitution, unjust enrichment',
    'lease, tenancy, rent, ejectment',
    'res judicata, estoppel',
    'partition, joint property, co-owner',
    'succession, inheritance, will, probate',
  ],
  Constitutional: [
    'suo motu, Article 184(3), fundamental rights',
    'fundamental rights, life, liberty, fair trial',
    'election, disqualification, parliament',
    'constitutional jurisdiction, high court',
    'property rights, compulsory acquisition',
    'freedom of speech, right to information',
    'freedom of assembly, political rights',
    'high treason, constitution, loyalty',
    'equality, non-discrimination, women',
    'social justice, economic rights',
    'judiciary, Supreme Court',
    'Election Commission, delimitation',
  ],
  Banking: [
    'banking, financial institutions, recovery',
    'NPL, default, recovery, loan',
    'SBP, banking, regulation, monetary',
    'cheque dishonour, NI Act',
    'loan recovery, mortgage, charge',
    'bank guarantee, letter of credit',
    'corporate finance, SECP, borrowing',
    'capital market, securities, shares',
  ],
  Corporate: [
    'incorporation, company, memorandum',
    'directors, board, resolution',
    'winding up, insolvency, liquidation',
    'partnership, dissolution, accounts',
    'restraint of trade, non-compete',
    'oppression, mismanagement, shareholder',
    'merger, amalgamation, scheme',
    'SECP, listed company, compliance',
    'competition, monopoly, cartel',
  ],
  Service: [
    'service, appointment, qualification',
    'disciplinary proceedings, penalty',
    'promotion, seniority, merit',
    'retirement, pension, gratuity',
    'service tribunal, appeal',
    'probation, confirmation, regularization',
    'deputation, transfer, posting',
    'natural justice, hearing, bias',
    'pension, commutation, family pension',
  ],
  Family: [
    'khula, divorce, dissolution, talaq',
    'maintenance, nafaqa, iddat',
    'child custody, hizanat, guardianship',
    'guardian, ward, minor, property',
    'dissolution of marriage, cruelty',
    'dowry, bridal gifts, recovery',
    'family court, reconciliation',
    'domestic violence, protection',
  ],
  Tax: [
    'income tax, assessment, return',
    'sales tax, input, output, refund',
    'excise duty, federal excise',
    'customs, import, export, valuation',
    'tax evasion, concealment, penalty',
    'sales tax refund, adjudication',
    'wealth tax, asset, declaration',
    'valuation, classification, customs',
  ],
  Property: [
    'sale deed, title, conveyance',
    'mortgage, equitable mortgage',
    'lis pendens, transfer pending suit',
    'part performance, Section 53A',
    'mutation, jamabandi, revenue record',
    'possession, ownership, title',
    'succession, inheritance, will',
    'tenancy, lease, rent, ejectment',
    'acquisition, compensation, land',
  ],
  Contract: [
    'contract, agreement, consideration',
    'free consent, coercion, fraud',
    'unlawful consideration, void',
    'contingent contract',
    'breach, damages, repudiation',
    'restitution, quantum meruit',
    'indemnity, guarantee, surety',
    'bailment, deposit, lien',
    'pledge, pawnor, pawnee',
    'agency, principal, authority',
  ],
  Tort: [
    'negligence, accident, compensation',
    'motor accident, vehicle, insurance',
    'workmen, injury, employment',
    'railway, accident, passenger',
    'defamation, libel, slander',
    'nuisance, trespass, injunction',
    'medical negligence, malpractice',
    'malicious prosecution',
    'easement, right of way',
  ],
};

const DESC_MAP = {
  Criminal: [
    'Appeal against conviction under PPC — examination of circumstantial evidence and medical testimony.',
    'Bail petition in serious criminal case — court evaluated strength of prosecution evidence and period of incarceration.',
    'Criminal appeal against acquittal — assessment of prosecution evidence and credibility of witnesses.',
    'Confirmation of death sentence — review of evidence and application of principles of qisas and diyat.',
    'Appeal against conviction in narcotics case — analysis of recovery procedures and chemical examination.',
    'Petition for cancellation of bail — grounds of misuse of bail and tampering with prosecution evidence.',
    'Murder appeal — determination of whether case falls within exceptions to qatl-e-amd.',
    'Reference under Section 374 CrPC for confirmation of capital sentence — detailed review of evidence.',
    'Criminal appeal against acquittal in honour killing case — interpretation of PPC 302 and 311.',
    'Bail application in drug trafficking case — consideration of evidentiary threshold.',
    'Appeal against conviction in attempt to murder case — evaluation of intent and injury reports.',
    'Petition for pre-arrest bail — apprehension of arrest in corporate fraud investigation.',
    'Criminal appeal against conviction in dacoity case — assessment of identification parade and recovery.',
    'Application for post-arrest bail in kidnapping case — recovery of victim and custodial interrogation.',
    'Criminal revision against order of maintenance — interpretation of Muslim family laws.',
  ],
  Civil: [
    'Suit for specific performance of contract for sale of immovable property — examination of agreement.',
    'Civil revision against order rejecting plaint under O 7 R 11 CPC — determination of cause of action.',
    'Regular first appeal against judgment and decree — limitation and acknowledgment of liability.',
    'Suit for recovery of money based on agreement — interpretation of Contract Act provisions.',
    'Property dispute — validity of sale deed challenged on grounds of fraud and undue influence.',
    'Suit for declaration and permanent injunction regarding immovable property — question of title.',
    'Appeal against order granting temporary injunction — prima facie case and balance of convenience.',
    'Suit for possession through specific performance — part performance and Section 53A of TPA.',
    'Civil suit for damages for breach of contract — assessment of liquidated damages.',
    'Partition suit among co-heirs — determination of shares in ancestral property.',
    'Suit for ejectment of tenant — relationship of landlord and tenant and notice requirements.',
    'Appeal against decree for recovery of possession — adverse possession and limitation.',
    'Civil suit challenging gift deed — validity of gift under Muslim personal law.',
    'Suit for accounting and rendition of accounts — fiduciary relationship and liability.',
    'Appeal against judgment in declaratory suit — interpretation of will and succession rights.',
  ],
  Constitutional: [
    'Suo motu exercise of jurisdiction under Article 184(3) regarding enforcement of fundamental rights.',
    'Constitutional petition under Article 199 challenging executive action as violative of fundamental rights.',
    'Appeal against High Court order under Article 185(3) — interpretation of constitutional provisions.',
    'Challenge to vires of legislation on grounds of violation of fundamental rights.',
    'Petition regarding property rights and compulsory acquisition under Article 23 and 24.',
    'Right to information petition — access to public documents and transparency.',
    'Challenge to election disqualification under Article 62(1)(f) — interpretation of constitutional provision.',
    'Constitutional petition regarding freedom of speech and expression in digital media.',
    'Human rights case regarding prison conditions and treatment of under-trial prisoners.',
    'Petition challenging discriminatory laws under Article 25 and 27.',
    'Constitutional petition regarding appointment of judges and judicial independence.',
    'Challenge to executive orders on grounds of mala fide and constitutional overreach.',
    'Case regarding delimitation of constituencies and electoral rolls.',
    'Constitutional petition regarding protection of minorities and religious freedom.',
    'Appeal regarding interpretation of Article 199 jurisdiction and scope of judicial review.',
  ],
  Banking: [
    'Suit for recovery of finance under Financial Institutions Recovery Act — default in repayment of loan.',
    'Appeal against order of Banking Court — determination of outstanding liability and rate of markup.',
    'Petition against invocation of bank guarantee — principles governing unconditional guarantees.',
    'Complaint under Section 138 NI Act — dishonour of cheque issued for discharge of liability.',
    'Suit for recovery of loan amount — interpretation of mortgage deed and charge documents.',
    'Appeal against Banking Court decree — validity of pledge of shares and securities.',
    'Application for leave to defend in summary suit — triable issues in banking transaction.',
    'Reference to Banking Tribunal regarding classification of NPL and provisioning.',
    'Suit for declaration that loan agreement is void on grounds of excessive interest.',
    'Petition regarding securitization and enforcement of security under banking laws.',
  ],
  Corporate: [
    'Petition for winding up of company on grounds of inability to pay debts — statutory notice.',
    'Appeal against refusal to register transfer of shares — company right to refuse registration.',
    'Petition against oppression and mismanagement — relief under Companies Act.',
    'Suit for dissolution of partnership firm and rendition of accounts.',
    'Application challenging restraint of trade clause in shareholders agreement.',
    'Petition for sanction of scheme of amalgamation — compliance with Companies Act.',
    'Appeal against order of SECP regarding listing regulations and disclosure.',
    'Petition regarding appointment of directors and conduct of board meetings.',
    'Reference regarding pre-emptive rights and issuance of further shares.',
    'Suit for recovery of corporate debt — enforcement of personal guarantee of directors.',
  ],
  Service: [
    'Service appeal against order of dismissal — violation of principles of natural justice.',
    'Constitutional petition challenging promotion policy — alleged discrimination.',
    'Appeal against order of compulsory retirement — determination of public interest.',
    'Petition for confirmation of service after probation period — deemed confirmation.',
    'Service appeal against adverse annual confidential report — mala fide grounds.',
    'Petition regarding seniority determination — interpretation of service rules.',
    'Appeal against order of reversion from officiating rank — substantive right.',
    'Petition for grant of pension and retirement benefits — qualifying service.',
    'Service appeal against penalty of stoppage of increment — proportionality.',
    'Petition regarding transfer and posting policy — alleged violation of guidelines.',
  ],
  Family: [
    'Suit for dissolution of marriage on grounds of cruelty and non-maintenance.',
    'Petition for custody of minor children — welfare of minor as paramount consideration.',
    'Suit for recovery of dowry articles and bridal gifts — inventory and valuation.',
    'Petition for maintenance of wife and children — determination of income.',
    'Guardianship application for minor property — natural guardian and powers.',
    'Suit for jactitation of marriage — declaration regarding validity of marriage.',
    'Petition for restitution of conjugal rights — grounds for refusal.',
    'Application for guardianship of minor — fitness of guardian.',
    'Suit for declaration of marriage and divorce — proof and validity of talaq.',
    'Petition under Domestic Violence Act for protection order.',
  ],
  Tax: [
    'Income tax reference regarding addition of concealed income — unexplained deposits.',
    'Appeal against order of Customs Appellate Tribunal — valuation of imported goods.',
    'Sales tax appeal regarding denial of input tax adjustment — procedural compliance.',
    'Reference on question of law regarding treatment of capital gains as business income.',
    'Appeal against penalty for late filing of income tax return — reasonable cause.',
    'Petition regarding refund of sales tax — unjust enrichment and limitation.',
    'Customs appeal regarding classification of imported goods under correct PCT heading.',
    'Reference regarding exclusion of exemption on agricultural income.',
    'Appeal against order confirming tax demand under Section 122 of Income Tax Ordinance.',
    'Petition challenging reassessment proceedings — change of opinion.',
  ],
  Property: [
    'Suit for declaration and possession of immovable property — challenge to sale deed.',
    'Appeal against decree for specific performance of agreement to sell.',
    'Suit challenging mutation of inheritance — determination of shares under Muslim law.',
    'Petition for correction of revenue record — jamabandi entry and actual possession.',
    'Suit for redemption of mortgage — right to redeem and accounting.',
    'Appeal against order of eviction under rent laws — bona fide personal need.',
    'Suit for partition of joint property — metes and bounds division.',
    'Reference under Land Acquisition Act — determination of market value.',
    'Suit for permanent injunction restraining alienation of property.',
    'Appeal regarding validity of gift deed under Muslim law.',
  ],
  Contract: [
    'Suit for recovery of earnest money paid under agreement to sell — breach of contract.',
    'Appeal against decree for damages — assessment of liquidated damages.',
    'Suit for declaration that contract is void for want of consideration.',
    'Petition for enforcement of arbitration agreement — reference to arbitration.',
    'Suit for specific performance of contract of sale — readiness and willingness.',
    'Appeal regarding validity of indemnity contract — scope of liability.',
    'Suit on contract of guarantee — liability of surety.',
    'Petition for recovery of money lent — debtor-creditor relationship.',
    'Suit for damages for breach of warranty — sale of goods.',
    'Appeal regarding contract of agency — authority of agent.',
  ],
  Tort: [
    'Suit for compensation in motor vehicle accident — rash driving and negligence.',
    'Claim petition under Workmen Compensation Act — injury during employment.',
    'Suit for damages for defamation — publication of defamatory statements.',
    'Appeal against award of compensation under Fatal Accidents Act.',
    'Suit for damages for medical negligence — breach of duty of care.',
    'Petition for injunction against nuisance — interference with property.',
    'Suit for compensation for malicious prosecution — want of reasonable cause.',
    'Claim for damages against railway administration — accident at level crossing.',
    'Suit for declaration of easementary rights — right of way by prescription.',
    'Appeal regarding assessment of damages in tort — remoteness.',
  ],
};

const SC_TITLES = [
  '{p1} v. Federation of Pakistan',
  '{p1} v. State',
  'Federation of Pakistan v. {p1}',
  'Province of {prov} v. {p1}',
  '{p1} v. Province of {prov}',
  'Human Rights Case No. {n}',
  '{p1} v. {p2}',
  'Chairman NAB v. {p1}',
  'Election Commission v. {p1}',
  'State v. {p1}',
  'PLC v. {p1}',
  '{p1} v. NAB',
  'Suo Motu Case No. {n}',
  '{p1} v. Election Commission',
  'Mst. {f} v. {p1}',
];

const SC_DESC = [
  'Constitutional appeal regarding division of powers between federation and provinces.',
  'Appeal against conviction — review of evidence by Supreme Court under Article 185(3).',
  'Provincial reference regarding interpretation of legislative powers.',
  'Criminal appeal maintaining conviction — aggravating and mitigating factors.',
  'Suo motu proceedings regarding enforcement of fundamental rights of vulnerable segments.',
  'Civil appeal regarding interpretation of contract terms and intention of parties.',
  'Appeal against quashment of reference — scope of NAB Ordinance.',
  'Election dispute regarding disqualification and scrutiny of nomination papers.',
  'Service appeal regarding seniority and promotion — civil servants rules.',
  'Reference under Section 374 CrPC for confirmation of death sentence.',
  'Judicial review of executive actions under Article 184(3).',
  'Landmark judgment on right to fair trial under Article 10-A.',
  'Right to property and environmental protection under Article 23 and 24.',
  'Principles of qisas and diyat in murder cases under PPC.',
  'Women property rights under Islamic law and Constitution.',
];

const SHC_TITLES = [
  '{p1} v. State',
  '{p1} v. Province of Sindh',
  '{p1} v. Federation of Pakistan',
  '{p1} v. {p2}',
  'Mst. {f} v. {p1}',
  '{p1} v. State Bank of Pakistan',
  'Government of Sindh v. {p1}',
  '{p1} v. NAB',
  'Commissioner of Income Tax v. {p1}',
  '{p1} v. Karachi Port Trust',
  '{p1} v. City Court Karachi',
  '{p1} v. Pakistan Customs',
  '{p1} v. Sui Southern Gas',
  '{p1} v. K-Electric',
  '{p1} v. Sindh Revenue Board',
];

const SHC_DESC = [
  'Criminal appeal against conviction — appreciation of evidence and benefit of doubt.',
  'Constitutional petition regarding service matters and disciplinary proceedings.',
  'Family suit for dissolution of marriage and recovery of dower.',
  'Civil suit for recovery of money on basis of promissory note.',
  'Constitutional petition challenging vires of federal law on fundamental rights.',
  'Banking dispute regarding recovery of loan and enforcement of mortgage.',
  'Suit for maintenance and child custody under Family Courts Act.',
  'Appeal against order of Service Tribunal regarding reinstatement and back benefits.',
  'Bail application in NAB reference — post-arrest bail and evidentiary threshold.',
  'Income tax reference regarding capital gains and business income classification.',
  'Customs appeal regarding confiscation of imported goods.',
  'Suit for declaration and permanent injunction in property dispute.',
  'Constitutional petition regarding eviction of tenant under Sindh Rented Premises Act.',
  'Petition for pre-arrest bail in commercial dispute.',
  'Appeal against conviction in narcotics case — recovery and chemical analysis.',
];

const BHC_TITLES = [
  '{p1} v. State',
  '{p1} v. Province of Balochistan',
  '{p1} v. Federation',
  'Mst. {f} v. {p1}',
  '{p1} v. {p2}',
  'Government of Balochistan v. {p1}',
  '{p1} v. Mineral Department Balochistan',
  '{p1} v. Gwadar Development Authority',
  '{p1} v. Quetta Development Authority',
  '{p1} v. Pakistan Army',
  '{p1} v. Balochistan Public Service Commission',
  '{p1} v. Balochistan Revenue Authority',
  'Mst. {f} v. Province of Balochistan',
  '{p1} v. Sui Southern Gas',
  '{p1} v. Pakistan Telecommunications',
];

const BHC_DESC = [
  'Bail application in murder case — prima facie involvement and recovery evidence.',
  'Service appeal against transfer order — alleged violation of transfer policy.',
  'Suit for dissolution of marriage on grounds of cruelty and desertion.',
  'Civil dispute regarding title and possession of agricultural land.',
  'Constitutional petition regarding mineral rights and provincial autonomy.',
  'Criminal appeal against conviction in narcotics case.',
  'Guardianship application for custody of minor children.',
  'Appeal regarding land acquisition compensation and market value.',
  'Petition for pre-arrest bail in civil dispute turned criminal.',
  'Constitutional petition regarding employment on domicile quota.',
  'Service appeal regarding seniority and promotion in provincial department.',
  'Suit for recovery of dues on basis of supply contract.',
  'Appeal against conviction in dacoity case.',
  'Petition regarding regularization of contract employees.',
  'Reference regarding valuation of minerals and royalty payments.',
];

const IHC_TITLES = [
  '{p1} v. Federation',
  '{p1} v. State',
  '{p1} v. Capital Development Authority',
  '{p1} v. Securities and Exchange Commission',
  'Mst. {f} v. {p1}',
  '{p1} v. Pakistan Environmental Protection Agency',
  '{p1} v. Islamabad Police',
  '{p1} v. Federal Board of Revenue',
  '{p1} v. Pakistan Telecommunication Authority',
  '{p1} v. Higher Education Commission',
];

const IHC_DESC = [
  'Constitutional petition under Article 199 regarding fundamental rights enforcement.',
  'Post-arrest bail in white collar crime — accountability court jurisdiction.',
  'Family suit for dissolution of marriage and maintenance.',
  'Property dispute regarding allotment and ownership of residential plot.',
  'Corporate appeal regarding imposition of penalty for non-compliance.',
  'Petition regarding environmental impact assessment of construction project.',
  'Criminal appeal against conviction in cybercrime case.',
  'Tax reference regarding assessment of income from capital gains.',
  'Service matter regarding regularization of daily wage employees.',
  'Constitutional petition regarding admission policy in educational institutions.',
];

const DC_TITLES = [
  '{p1} v. State',
  '{p1} v. {p2}',
  'Mst. {f} v. {p1}',
  'State v. {p1}',
  '{p1} v. Union Council',
  '{p1} v. Municipality',
  '{p1} v. Revenue Officer',
  '{p1} v. Local Government',
  '{p1} v. Education Board',
  '{p1} v. Health Department',
];

const DC_DESC = [
  'Criminal trial — conviction under PPC for theft and house breaking.',
  'Civil suit for recovery of loan amount on basis of agreement.',
  'Suit for maintenance and dowry recovery under family law.',
  'Criminal case — trial for offences under PPC and conviction.',
  'Suit for possession of property through ownership title.',
  'Petition for grant of succession certificate.',
  'Suit for declaration regarding tenancy rights.',
  'Criminal complaint regarding trespass and criminal force.',
  'Civil suit for damages for breach of contract.',
  'Application for pre-arrest bail in matrimonial dispute.',
];

const PROVINCES = ['Punjab','Sindh','Khyber Pakhtunkhwa','Balochistan'];

function render(str, map) {
  let r = str;
  for (const [k, v] of Object.entries(map)) {
    r = r.replaceAll(`{${k}}`, v);
  }
  return r;
}

function generateCases() {
  const all = [];
  let ctr = 1;

  function make(court, titles, descs, yStart, yEnd, count) {
    for (let i = 0; i < count; i++) {
      const cat = CATEGORIES[i % CATEGORIES.length];
      const reporters = REPORTERS_MAP[cat];
      const rep = reporters[i % reporters.length];
      const idx = i % titles.length;
      const didx = i % descs.length;
      const year = yStart + (i % (yEnd - yStart + 1));
      const fn = FIRST[i % FIRST.length];
      const ln = LAST[i % LAST.length];
      const fn2 = FIRST[(i * 7 + 3) % FIRST.length];
      const ln2 = LAST[(i * 11 + 5) % LAST.length];
      const female = FEMALE[i % FEMALE.length];
      const prov = PROVINCES[i % PROVINCES.length];
      const sIdx = i % STATUTES_MAP[cat].length;
      const kIdx = i % KEYWORDS_MAP[cat].length;
      const dIdx = i % DESC_MAP[cat].length;

      let title = render(titles[idx], { p1: `${fn} ${ln}`, p2: `${fn2} ${ln2}`, f: female, n: String(1000 + i), prov });
      const citation = `${year} ${rep} ${600 + i}`;
      const parties = title.includes('v.') ? title : `${fn} ${ln} v. ${fn2} ${ln2}`;
      const desc = render(descs[didx], { p1: `${fn} ${ln}`, p2: `${fn2} ${ln2}`, f: female, n: String(1000 + i), prov });
      const statutes = STATUTES_MAP[cat][sIdx];
      const keywords = KEYWORDS_MAP[cat][kIdx];

      all.push({
        title,
        citation,
        court,
        year,
        parties,
        category: cat,
        description: desc,
        relevant_statutes: statutes,
        keywords,
      });
      ctr++;
    }
  }

  make('Supreme Court of Pakistan', SC_TITLES, SC_DESC, 2010, 2025, 150);
  make('Sindh High Court', SHC_TITLES, SHC_DESC, 2005, 2026, 400);
  make('Balochistan High Court', BHC_TITLES, BHC_DESC, 2008, 2026, 200);
  make('Islamabad High Court', IHC_TITLES, IHC_DESC, 2012, 2026, 50);

  // District Courts — 200 cases spread across different districts
  for (let i = 0; i < 200; i++) {
    const cat = CATEGORIES[i % CATEGORIES.length];
    const reporters = REPORTERS_MAP[cat];
    const rep = reporters[i % reporters.length];
    const idx = i % DC_TITLES.length;
    const didx = i % DC_DESC.length;
    const year = 2010 + (i % 17);
    const fn = FIRST[i % FIRST.length];
    const ln = LAST[i % LAST.length];
    const fn2 = FIRST[(i * 7 + 3) % FIRST.length];
    const ln2 = LAST[(i * 11 + 5) % LAST.length];
    const female = FEMALE[i % FEMALE.length];
    const district = DISTRICTS[i % DISTRICTS.length];
    const court = `District Court of ${district}`;
    const sIdx = i % STATUTES_MAP[cat].length;
    const kIdx = i % KEYWORDS_MAP[cat].length;
    const dIdx = i % DESC_MAP[cat].length;

    let title = render(DC_TITLES[idx], { p1: `${fn} ${ln}`, p2: `${fn2} ${ln2}`, f: female, n: String(2000 + i), prov: '' });
    const citation = `${year} ${rep} ${1400 + i}`;
    const parties = title.includes('v.') ? title : `${fn} ${ln} v. ${fn2} ${ln2}`;
    const desc = render(DC_DESC[didx], { p1: `${fn} ${ln}`, p2: `${fn2} ${ln2}`, f: female, n: String(2000 + i), prov: '' });
    const statutes = STATUTES_MAP[cat][sIdx];
    const keywords = KEYWORDS_MAP[cat][kIdx];

    all.push({
      title,
      citation,
      court,
      year,
      parties,
      category: cat,
      description: desc,
      relevant_statutes: statutes,
      keywords,
    });
  }

  return all;
}

export async function seedExpand() {
  try {
    console.log('[seed-expand] Starting expansion seed...');

    const r1 = await queryOne(`SELECT COUNT(*) as c FROM citations WHERE court = 'Sindh High Court'`);
    const r2 = await queryOne(`SELECT COUNT(*) as c FROM citations WHERE court = 'Balochistan High Court'`);
    const r3 = await queryOne(`SELECT COUNT(*) as c FROM citations WHERE court LIKE 'District Court of %'`);

    const sindh = Number(r1?.c || 0);
    const baloch = Number(r2?.c || 0);
    const dist = Number(r3?.c || 0);

    console.log(`[seed-expand] Existing — Sindh HC: ${sindh}, Balochistan HC: ${baloch}, District Courts: ${dist}`);

    if (sindh >= 300 && baloch >= 100 && dist >= 50) {
      console.log(`[seed-expand] Sufficient cases exist — skipping`);
      return;
    }

    const allCases = generateCases();
    let inserted = 0;
    let skipped = 0;

    for (const c of allCases) {
      const exist = await queryOne('SELECT id FROM citations WHERE citation = ?', [c.citation]);
      if (exist) { skipped++; continue; }
      try {
        await run(
          `INSERT INTO citations (id,title,citation,court,year,parties,category,description,relevant_statutes,keywords)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [uuid(), c.title, c.citation, c.court, c.year, c.parties, c.category, c.description, c.relevant_statutes, c.keywords]
        );
        inserted++;
      } catch (err) {
        console.error(`[seed-expand] Error inserting "${c.citation}": ${err.message}`);
        skipped++;
      }
    }

    console.log(`[seed-expand] Complete — ${inserted} inserted, ${skipped} skipped`);
  } catch (err) {
    console.error(`[seed-expand] Fatal error: ${err.message}`);
  }
}
