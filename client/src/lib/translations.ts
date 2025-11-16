export type Language = "en" | "ig" | "ha" | "yo";

export interface Translations {
  // Common
  appName: string;
  home: string;
  login: string;
  register: string;
  logout: string;
  profile: string;
  settings: string;
  back: string;
  submit: string;
  cancel: string;
  save: string;
  edit: string;
  delete: string;
  loading: string;
  error: string;
  success: string;
  
  // Navigation
  dashboard: string;
  campaigns: string;
  elections: string;
  events: string;
  news: string;
  leaderboard: string;
  points: string;
  tasks: string;
  volunteers: string;
  donations: string;
  
  // Dashboard
  welcomeBack: string;
  yourPoints: string;
  yourRank: string;
  nationalRank: string;
  stateRank: string;
  recentActivity: string;
  upcomingEvents: string;
  latestNews: string;
  
  // Points & Rewards
  redeemPoints: string;
  pointBalance: string;
  earnPoints: string;
  buyAirtime: string;
  buyData: string;
  transactionHistory: string;
  pointsAwarded: string;
  
  // Profile
  myProfile: string;
  personalInfo: string;
  membershipStatus: string;
  joinDate: string;
  ward: string;
  lga: string;
  state: string;
  phoneNumber: string;
  email: string;
  
  // ID Card
  digitalIdCard: string;
  downloadCard: string;
  shareCard: string;
  verifyCard: string;
  memberSince: string;
  scanToVerify: string;
  
  // Actions
  viewDetails: string;
  readMore: string;
  getStarted: string;
  joinNow: string;
  learnMore: string;
  downloadApp: string;
  
  // Status
  active: string;
  pending: string;
  inactive: string;
  verified: string;
  notVerified: string;
  
  // Messages
  loginSuccess: string;
  loginFailed: string;
  registrationSuccess: string;
  registrationFailed: string;
  updateSuccess: string;
  updateFailed: string;
  
  // Landing Page
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  totalMembers: string;
  lgasCovered: string;
  realTimeUpdates: string;
  blockchainSecured: string;
  
  // Features
  features: string;
  ninVerification: string;
  electronicVoting: string;
  membershipDues: string;
  gamification: string;
  
  // Footer
  aboutUs: string;
  contactUs: string;
  privacyPolicy: string;
  termsOfService: string;
  followUs: string;
  copyright: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Common
    appName: "APC Connect",
    home: "Home",
    login: "Login",
    register: "Register",
    logout: "Logout",
    profile: "Profile",
    settings: "Settings",
    back: "Back",
    submit: "Submit",
    cancel: "Cancel",
    save: "Save",
    edit: "Edit",
    delete: "Delete",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    
    // Navigation
    dashboard: "Dashboard",
    campaigns: "Campaigns",
    elections: "Elections",
    events: "Events",
    news: "News",
    leaderboard: "Leaderboard",
    points: "Points",
    tasks: "Tasks",
    volunteers: "Volunteers",
    donations: "Donations",
    
    // Dashboard
    welcomeBack: "Welcome back",
    yourPoints: "Your Points",
    yourRank: "Your Rank",
    nationalRank: "National Rank",
    stateRank: "State Rank",
    recentActivity: "Recent Activity",
    upcomingEvents: "Upcoming Events",
    latestNews: "Latest News",
    
    // Points & Rewards
    redeemPoints: "Redeem Points",
    pointBalance: "Point Balance",
    earnPoints: "Earn Points",
    buyAirtime: "Buy Airtime",
    buyData: "Buy Data",
    transactionHistory: "Transaction History",
    pointsAwarded: "Points Awarded",
    
    // Profile
    myProfile: "My Profile",
    personalInfo: "Personal Information",
    membershipStatus: "Membership Status",
    joinDate: "Join Date",
    ward: "Ward",
    lga: "LGA",
    state: "State",
    phoneNumber: "Phone Number",
    email: "Email",
    
    // ID Card
    digitalIdCard: "Digital ID Card",
    downloadCard: "Download Card",
    shareCard: "Share Card",
    verifyCard: "Verify Card",
    memberSince: "Member Since",
    scanToVerify: "Scan to verify authenticity",
    
    // Actions
    viewDetails: "View Details",
    readMore: "Read More",
    getStarted: "Get Started",
    joinNow: "Join Now",
    learnMore: "Learn More",
    downloadApp: "Download the App",
    
    // Status
    active: "Active",
    pending: "Pending",
    inactive: "Inactive",
    verified: "Verified",
    notVerified: "Not Verified",
    
    // Messages
    loginSuccess: "Login successful!",
    loginFailed: "Login failed",
    registrationSuccess: "Registration successful!",
    registrationFailed: "Registration failed",
    updateSuccess: "Updated successfully",
    updateFailed: "Update failed",
    
    // Landing Page
    heroTitle: "Empower Nigeria's Future",
    heroSubtitle: "Join APC Connect",
    heroDescription: "Your all-in-one digital platform to engage, vote, and shape democracy across all 774 LGAs in Nigeria.",
    totalMembers: "1M+ Members",
    lgasCovered: "774 LGAs Covered",
    realTimeUpdates: "Real-time Updates",
    blockchainSecured: "Blockchain Secured",
    
    // Features
    features: "Features",
    ninVerification: "NIN Verification",
    electronicVoting: "Electronic Voting",
    membershipDues: "Membership Dues",
    gamification: "Gamification",
    
    // Footer
    aboutUs: "About Us",
    contactUs: "Contact Us",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    followUs: "Follow Us",
    copyright: "© 2024 All Progressives Congress. All rights reserved.",
  },
  
  ig: {
    // Common (Igbo)
    appName: "APC Jikọta",
    home: "Ebe Obibi",
    login: "Banye",
    register: "Debanye Aha",
    logout: "Pụọ",
    profile: "Profaịlụ",
    settings: "Ntọala",
    back: "Laghachi Azụ",
    submit: "Zite",
    cancel: "Kagbuo",
    save: "Chekwaa",
    edit: "Degharịa",
    delete: "Hichapụ",
    loading: "Na-ebu...",
    error: "Njehie",
    success: "Ihe Ịga Nke Ọma",
    
    // Navigation
    dashboard: "Bọọdụ Njikwa",
    campaigns: "Mkpọsa",
    elections: "Ntuli Aka",
    events: "Mmemme",
    news: "Akụkọ",
    leaderboard: "Ndekọ Ọkwa",
    points: "Isi Akara",
    tasks: "Ọrụ",
    volunteers: "Ndị Afọ Ọfụma",
    donations: "Onyinye",
    
    // Dashboard
    welcomeBack: "Nnọọ",
    yourPoints: "Isi Akara Gị",
    yourRank: "Ọkwa Gị",
    nationalRank: "Ọkwa Mba",
    stateRank: "Ọkwa Steeti",
    recentActivity: "Ihe Mere N'oge Na-adịbeghị Anya",
    upcomingEvents: "Mmemme Na-abịa",
    latestNews: "Akụkọ Ọhụrụ",
    
    // Points & Rewards
    redeemPoints: "Gbapụta Isi Akara",
    pointBalance: "Ngụkọta Isi Akara",
    earnPoints: "Nweta Isi Akara",
    buyAirtime: "Zụta Airtime",
    buyData: "Zụta Data",
    transactionHistory: "Akụkọ Azụmaahịa",
    pointsAwarded: "Isi Akara Enyere",
    
    // Profile
    myProfile: "Profaịlụ M",
    personalInfo: "Ozi Onwe",
    membershipStatus: "Ọnọdụ Ndị Otu",
    joinDate: "Ụbọchị Isonye",
    ward: "Ward",
    lga: "LGA",
    state: "Steeti",
    phoneNumber: "Nọmba Ekwentị",
    email: "Email",
    
    // ID Card
    digitalIdCard: "Kaadị ID Dijitalụ",
    downloadCard: "Budata Kaadị",
    shareCard: "Kesaa Kaadị",
    verifyCard: "Nyochaa Kaadị",
    memberSince: "Onye Otu Kemgbe",
    scanToVerify: "Nyochaa iji kwenye eziokwu",
    
    // Actions
    viewDetails: "Lee Nkọwa",
    readMore: "Gụkwuo",
    getStarted: "Malite",
    joinNow: "Sonye Ugbu a",
    learnMore: "Mụtakwuo",
    downloadApp: "Budata Ngwa Ahụ",
    
    // Status
    active: "Na-arụ Ọrụ",
    pending: "Na-eche",
    inactive: "Anaghị Arụ Ọrụ",
    verified: "Ekwenyela",
    notVerified: "Ekwenyebeghị",
    
    // Messages
    loginSuccess: "Ịbanye Gara Nke Ọma!",
    loginFailed: "Ịbanye Emezughị",
    registrationSuccess: "Ndebanye Aha Gara Nke Ọma!",
    registrationFailed: "Ndebanye Aha Emezughị",
    updateSuccess: "Emelitela Nke Ọma",
    updateFailed: "Mmelite Emezughị",
    
    // Landing Page
    heroTitle: "Nye Ike Ọdịnihu Naịjirịa",
    heroSubtitle: "Sonye na APC Jikọta",
    heroDescription: "Ikpo okwu dijitalụ gị iji tinye aka, votu, ma kpụọ ọchịchị onye kwuo uche ya n'ofe LGA 774 niile na Naịjirịa.",
    totalMembers: "Ndị Otu 1M+",
    lgasCovered: "LGA 774 Kpuchiri",
    realTimeUpdates: "Mmelite Oge N'ezie",
    blockchainSecured: "Blockchain Echekwara",
    
    // Features
    features: "Njirimara",
    ninVerification: "Nkwenye NIN",
    electronicVoting: "Ntuli Aka Eletrọniki",
    membershipDues: "Ụgwọ Ndị Otu",
    gamification: "Egwuregwu",
    
    // Footer
    aboutUs: "Gbasara Anyị",
    contactUs: "Kpọtụrụ Anyị",
    privacyPolicy: "Iwu Nzuzo",
    termsOfService: "Usoro Ọrụ",
    followUs: "Soro Anyị",
    copyright: "© 2024 All Progressives Congress. Ikike Niile Echekwara.",
  },
  
  ha: {
    // Common (Hausa)
    appName: "APC Haɗa",
    home: "Gida",
    login: "Shiga",
    register: "Yi Rajista",
    logout: "Fita",
    profile: "Bayani",
    settings: "Saitunan",
    back: "Koma Baya",
    submit: "Aika",
    cancel: "Soke",
    save: "Ajiye",
    edit: "Gyara",
    delete: "Goge",
    loading: "Ana Lodi...",
    error: "Kuskure",
    success: "Nasara",
    
    // Navigation
    dashboard: "Allon Sarrafawa",
    campaigns: "Yaƙin Neman Zaɓe",
    elections: "Zaɓe",
    events: "Abubuwan da Suka Faru",
    news: "Labarai",
    leaderboard: "Allon Matsayi",
    points: "Maki",
    tasks: "Ayyuka",
    volunteers: "Masu Aikin Sa Kai",
    donations: "Gudummawa",
    
    // Dashboard
    welcomeBack: "Barka da Dawowa",
    yourPoints: "Makin Ka",
    yourRank: "Matsayinka",
    nationalRank: "Matsayin Ƙasa",
    stateRank: "Matsayin Jiha",
    recentActivity: "Ayyukan Kwanan Nan",
    upcomingEvents: "Abubuwan da Ke Zuwa",
    latestNews: "Sabbin Labarai",
    
    // Points & Rewards
    redeemPoints: "Karɓi Maki",
    pointBalance: "Ma'aunin Maki",
    earnPoints: "Sami Maki",
    buyAirtime: "Sayi Airtime",
    buyData: "Sayi Data",
    transactionHistory: "Tarihin Ciniki",
    pointsAwarded: "An Ba da Maki",
    
    // Profile
    myProfile: "Bayanina",
    personalInfo: "Bayanan Sirri",
    membershipStatus: "Matsayin Memba",
    joinDate: "Ranar Shiga",
    ward: "Unguwanni",
    lga: "LGA",
    state: "Jiha",
    phoneNumber: "Lambar Waya",
    email: "Imel",
    
    // ID Card
    digitalIdCard: "Katin ID na Dijital",
    downloadCard: "Zazzage Kati",
    shareCard: "Raba Kati",
    verifyCard: "Tabbatar da Kati",
    memberSince: "Memba Tun",
    scanToVerify: "Yi scan don tabbatarwa",
    
    // Actions
    viewDetails: "Duba Cikakkun Bayanai",
    readMore: "Karanta Ƙari",
    getStarted: "Fara",
    joinNow: "Shiga Yanzu",
    learnMore: "Kara Koyo",
    downloadApp: "Zazzage App",
    
    // Status
    active: "Mai Aiki",
    pending: "Ana Jira",
    inactive: "Ba Mai Aiki Ba",
    verified: "An Tabbatar",
    notVerified: "Ba a Tabbatar Ba",
    
    // Messages
    loginSuccess: "An Samu Nasarar Shiga!",
    loginFailed: "Shigar Ta Kasa",
    registrationSuccess: "An Samu Nasarar Yin Rajista!",
    registrationFailed: "Yin Rajista Ya Kasa",
    updateSuccess: "An Sabunta Cikin Nasara",
    updateFailed: "Sabuntawa Ya Kasa",
    
    // Landing Page
    heroTitle: "Ƙarfafa Makomar Najeriya",
    heroSubtitle: "Shiga APC Haɗa",
    heroDescription: "Dandalin dijital ɗinka don shiga, zaɓe, da tsara dimokuradiyya a duk LGA 774 a Najeriya.",
    totalMembers: "Membobi 1M+",
    lgasCovered: "LGA 774 An Rufe",
    realTimeUpdates: "Sabuntawa Na Ainihi",
    blockchainSecured: "An Kare da Blockchain",
    
    // Features
    features: "Fasaloli",
    ninVerification: "Tabbatar da NIN",
    electronicVoting: "Zaɓen Lantarki",
    membershipDues: "Kuɗin Memba",
    gamification: "Wasan Kwaikwayo",
    
    // Footer
    aboutUs: "Game da Mu",
    contactUs: "Tuntuɓe Mu",
    privacyPolicy: "Manufar Sirri",
    termsOfService: "Sharuɗɗan Sabis",
    followUs: "Bi Mu",
    copyright: "© 2024 All Progressives Congress. Dukkan Haƙƙoƙi An Kare.",
  },
  
  yo: {
    // Common (Yoruba)
    appName: "APC Sopọ",
    home: "Ile",
    login: "Wọle",
    register: "Forukọsilẹ",
    logout: "Jade",
    profile: "Profaili",
    settings: "Eto",
    back: "Pada Sẹyin",
    submit: "Firanṣẹ",
    cancel: "Fagilee",
    save: "Fipamọ",
    edit: "Ṣatunkọ",
    delete: "Pa",
    loading: "N Ṣiṣẹ...",
    error: "Aṣiṣe",
    success: "Aṣeyọri",
    
    // Navigation
    dashboard: "Pátákó Iṣakoso",
    campaigns: "Awọn Ipolongo",
    elections: "Idibo",
    events: "Awọn Iṣẹlẹ",
    news: "Iroyin",
    leaderboard: "Pátákó Ipele",
    points: "Awọn Aami",
    tasks: "Awọn Iṣẹ",
    volunteers: "Awọn Olùrànlọ́wọ́",
    donations: "Awọn Ẹbun",
    
    // Dashboard
    welcomeBack: "Káàbọ̀",
    yourPoints: "Awọn Aami Rẹ",
    yourRank: "Ipo Rẹ",
    nationalRank: "Ipo Orilẹ-ede",
    stateRank: "Ipo Ipinlẹ",
    recentActivity: "Iṣẹ Aipẹ",
    upcomingEvents: "Awọn Iṣẹlẹ Ti Nbọ",
    latestNews: "Iroyin Tuntun",
    
    // Points & Rewards
    redeemPoints: "Ra Awọn Aami Pada",
    pointBalance: "Iwọntunwọnsi Aami",
    earnPoints: "Jere Awọn Aami",
    buyAirtime: "Ra Airtime",
    buyData: "Ra Data",
    transactionHistory: "Itan-akọọlẹ Iṣowo",
    pointsAwarded: "Awọn Aami Ti A Fun",
    
    // Profile
    myProfile: "Profaili Mi",
    personalInfo: "Alaye Ti Ara Ẹni",
    membershipStatus: "Ipo Ọmọ Ẹgbẹ",
    joinDate: "Ọjọ Darapọ",
    ward: "Adagba",
    lga: "LGA",
    state: "Ipinlẹ",
    phoneNumber: "Nọmba Foonu",
    email: "Imeeli",
    
    // ID Card
    digitalIdCard: "Kaadi ID Oni-nọmba",
    downloadCard: "Gba Kaadi Kalẹ",
    shareCard: "Pin Kaadi",
    verifyCard: "Ṣayẹwo Kaadi",
    memberSince: "Ọmọ Ẹgbẹ Lati",
    scanToVerify: "Ṣayẹwo lati jẹrisi otitọ",
    
    // Actions
    viewDetails: "Wo Awọn Alaye",
    readMore: "Ka Siwaju Si",
    getStarted: "Bẹrẹ",
    joinNow: "Darapọ Bayi",
    learnMore: "Kọ Ẹkọ Diẹ Sii",
    downloadApp: "Gba Apo Kalẹ",
    
    // Status
    active: "Ti O Nṣiṣẹ",
    pending: "Nduro",
    inactive: "Ko Ṣiṣẹ",
    verified: "Ti Jẹrisi",
    notVerified: "Ko Ti Jẹrisi",
    
    // Messages
    loginSuccess: "Wiwọle Ṣaṣeyọri!",
    loginFailed: "Wiwọle Kuna",
    registrationSuccess: "Iforukọsilẹ Ṣaṣeyọri!",
    registrationFailed: "Iforukọsilẹ Kuna",
    updateSuccess: "Ti Ṣe Imudojuiwọn Ni Aṣeyọri",
    updateFailed: "Imudojuiwọn Kuna",
    
    // Landing Page
    heroTitle: "Fun Ọjọ Iwaju Naijiria Ni Agbara",
    heroSubtitle: "Darapọ APC Sopọ",
    heroDescription: "Pẹpẹ oni-nọmba rẹ fun gbogbo rẹ lati kopa, dibo, ati ṣe ijọba ijọba tọkọtaya ni gbogbo awọn LGA 774 ni Naijiria.",
    totalMembers: "Awọn Ọmọ Ẹgbẹ 1M+",
    lgasCovered: "Awọn LGA 774 Ti Bo",
    realTimeUpdates: "Awọn Imudojuiwọn Akoko Gidi",
    blockchainSecured: "Blockchain Ti Daabobo",
    
    // Features
    features: "Awọn Ẹya",
    ninVerification: "Ijẹrisi NIN",
    electronicVoting: "Idibo Itanna",
    membershipDues: "Gbese Ọmọ Ẹgbẹ",
    gamification: "Ere Idaraya",
    
    // Footer
    aboutUs: "Nipa Wa",
    contactUs: "Kan Si Wa",
    privacyPolicy: "Ilana Aṣiri",
    termsOfService: "Awọn Ofin Iṣẹ",
    followUs: "Tẹle Wa",
    copyright: "© 2024 All Progressives Congress. Gbogbo Ẹtọ Ni Ipamọ.",
  },
};
