export type Language = "en" | "ig" | "ha" | "yo";

export interface Translations {
  // Common
  appName: string;
  home: string;
  login: string;
  register: string;
  logout: string;
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
  
  // Navigation - Core
  dashboard: string;
  profile: string;
  news: string;
  search: string;
  
  // Navigation - Points & Rewards
  myPoints: string;
  purchasePoints: string;
  pointConversion: string;
  userTasks: string;
  referrals: string;
  
  // Navigation - Engagement
  tasksAndJobs: string;
  rewardsAndBadges: string;
  leaderboard: string;
  inviteAndEarn: string;
  
  // Navigation - Political
  electionsAndVoting: string;
  campaigns: string;
  volunteerTasks: string;
  
  // Navigation - Community
  events: string;
  ideasHub: string;
  donations: string;
  duesPayment: string;
  
  // Navigation - Knowledge
  politicalLiteracy: string;
  knowledgeBase: string;
  aboutAPC: string;
  
  // Navigation - Monitoring
  situationRoom: string;
  eventsGallery: string;
  leadership: string;
  
  // Navigation - Settings
  notificationSettings: string;
  
  // Navigation - Admin
  analytics: string;
  
  // Dashboard
  welcomeBack: string;
  yourPoints: string;
  yourRank: string;
  nationalRank: string;
  stateRank: string;
  recentActivity: string;
  upcomingEvents: string;
  latestNews: string;
  
  // Points & Rewards Pages
  redeemPoints: string;
  pointBalance: string;
  earnPoints: string;
  buyAirtime: string;
  buyData: string;
  transactionHistory: string;
  pointsAwarded: string;
  redemptionHistory: string;
  airtimeTopUp: string;
  dataTopUp: string;
  
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
  
  // Features Section
  features: string;
  ninVerification: string;
  electronicVoting: string;
  membershipDues: string;
  gamification: string;
  
  // Feature 1: Join the Party
  featureJoinTitle: string;
  featureJoinPoint1: string;
  featureJoinPoint2: string;
  featureJoinPoint3: string;
  
  // Feature 2: Shape Future
  featureShapeTitle: string;
  featureShapePoint1: string;
  featureShapePoint2: string;
  featureShapePoint3: string;
  
  // Feature 3: Mobilize
  featureMobilizeTitle: string;
  featureMobilizePoint1: string;
  featureMobilizePoint2: string;
  featureMobilizePoint3: string;
  
  // Feature 4: Elections
  featureElectionsTitle: string;
  featureElectionsPoint1: string;
  featureElectionsPoint2: string;
  featureElectionsPoint3: string;
  
  // Feature 5: Youth
  featureYouthTitle: string;
  featureYouthPoint1: string;
  featureYouthPoint2: string;
  featureYouthPoint3: string;
  
  // How It Works
  howItWorks: string;
  stepSignUpTitle: string;
  stepSignUpDesc: string;
  stepEngageTitle: string;
  stepEngageDesc: string;
  stepPayDuesTitle: string;
  stepPayDuesDesc: string;
  stepVoteTitle: string;
  stepVoteDesc: string;
  stepMobilizeTitle: string;
  stepMobilizeDesc: string;
  
  // Sections
  whatMembersSay: string;
  testimonials: string;
  ourImpact: string;
  selectYourState: string;
  joinYourState: string;
  
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
    
    // Navigation - Core
    dashboard: "Dashboard",
    profile: "Profile",
    news: "News",
    search: "Search",
    
    // Navigation - Points & Rewards
    myPoints: "My Points",
    purchasePoints: "Purchase Points",
    pointConversion: "Point Conversion",
    userTasks: "User Tasks",
    referrals: "Referrals",
    
    // Navigation - Engagement
    tasksAndJobs: "Tasks & Jobs",
    rewardsAndBadges: "Rewards & Badges",
    leaderboard: "Leaderboard",
    inviteAndEarn: "Invite & Earn",
    
    // Navigation - Political
    electionsAndVoting: "Elections & Voting",
    campaigns: "Campaigns",
    volunteerTasks: "Volunteer Tasks",
    
    // Navigation - Community
    events: "Events",
    ideasHub: "Ideas Hub",
    donations: "Donations",
    duesPayment: "Dues Payment",
    
    // Navigation - Knowledge
    politicalLiteracy: "Political Literacy",
    knowledgeBase: "Knowledge Base",
    aboutAPC: "About APC",
    
    // Navigation - Monitoring
    situationRoom: "Situation Room",
    eventsGallery: "Events Gallery",
    leadership: "Leadership",
    
    // Navigation - Settings
    notificationSettings: "Notification Settings",
    
    // Navigation - Admin
    analytics: "Analytics",
    
    // Dashboard
    welcomeBack: "Welcome back",
    yourPoints: "Your Points",
    yourRank: "Your Rank",
    nationalRank: "National Rank",
    stateRank: "State Rank",
    recentActivity: "Recent Activity",
    upcomingEvents: "Upcoming Events",
    latestNews: "Latest News",
    
    // Points & Rewards Pages
    redeemPoints: "Redeem Points",
    pointBalance: "Point Balance",
    earnPoints: "Earn Points",
    buyAirtime: "Buy Airtime",
    buyData: "Buy Data",
    transactionHistory: "Transaction History",
    pointsAwarded: "Points Awarded",
    redemptionHistory: "Redemption History",
    airtimeTopUp: "Airtime Top-up",
    dataTopUp: "Data Top-up",
    
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
    
    // Features Section
    features: "Features",
    ninVerification: "NIN Verification",
    electronicVoting: "Electronic Voting",
    membershipDues: "Membership Dues",
    gamification: "Gamification",
    
    // Feature 1: Join the Party
    featureJoinTitle: "Join the Party, Your Way",
    featureJoinPoint1: "Sign up with NIN verification in minutes",
    featureJoinPoint2: "Pay dues securely via mobile money or card",
    featureJoinPoint3: "Get your digital APC ID card for instant recognition",
    
    // Feature 2: Shape Future
    featureShapeTitle: "Shape the Future with Inclusive Governance",
    featureShapePoint1: "Share ideas and vote on policies that matter to you",
    featureShapePoint2: "Track elected officials' promises and hold them accountable",
    featureShapePoint3: "Participate in transparent electronic primaries",
    
    // Feature 3: Mobilize
    featureMobilizeTitle: "Mobilize Like Never Before",
    featureMobilizePoint1: "Share campaigns on X, WhatsApp, and Instagram with one tap",
    featureMobilizePoint2: "Lead local events and rallies with easy-to-use tools",
    featureMobilizePoint3: "Earn rewards for completing micro-tasks like inviting friends",
    
    // Feature 4: Elections
    featureElectionsTitle: "Power Up for Elections",
    featureElectionsPoint1: "Organize voter registration drives and canvassing",
    featureElectionsPoint2: "Vote securely in primaries with blockchain technology",
    featureElectionsPoint3: "Monitor elections in real-time with our situation room",
    
    // Feature 5: Youth
    featureYouthTitle: "Engage as a Young Leader",
    featureYouthPoint1: "Learn about APC and Nigerian politics through fun quizzes",
    featureYouthPoint2: "Connect with mentors and volunteer for campaigns",
    featureYouthPoint3: "Climb leaderboards and earn badges for your impact",
    
    // How It Works
    howItWorks: "How It Works",
    stepSignUpTitle: "Sign Up",
    stepSignUpDesc: "Register with your NIN and join your local ward",
    stepEngageTitle: "Engage",
    stepEngageDesc: "Explore events, share ideas, and volunteer for tasks",
    stepPayDuesTitle: "Pay Dues",
    stepPayDuesDesc: "Stay active with easy, secure payments",
    stepVoteTitle: "Vote & Lead",
    stepVoteDesc: "Participate in primaries and shape APC's future",
    stepMobilizeTitle: "Mobilize",
    stepMobilizeDesc: "Rally your community and track your impact",
    
    // Sections
    whatMembersSay: "What Our Members Say",
    testimonials: "Testimonials",
    ourImpact: "Our Impact Across Nigeria",
    selectYourState: "Select Your State",
    joinYourState: "Join Your State",
    
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
    
    // Navigation - Core
    dashboard: "Bọọdụ Njikwa",
    profile: "Profaịlụ",
    news: "Akụkọ",
    search: "Chọọ",
    
    // Navigation - Points & Rewards
    myPoints: "Isi Akara M",
    purchasePoints: "Zụta Isi Akara",
    pointConversion: "Ntụgharị Isi Akara",
    userTasks: "Ọrụ Onye Ọrụ",
    referrals: "Ndị Ị Kpọgara",
    
    // Navigation - Engagement
    tasksAndJobs: "Ọrụ & Ọrụ",
    rewardsAndBadges: "Ụgwọ Ọrụ & Akara",
    leaderboard: "Ndekọ Ọkwa",
    inviteAndEarn: "Kpọọ & Rite",
    
    // Navigation - Political
    electionsAndVoting: "Ntuli Aka & Ịtụ Vootu",
    campaigns: "Mkpọsa",
    volunteerTasks: "Ọrụ Ndị Afọ Ọfụma",
    
    // Navigation - Community
    events: "Mmemme",
    ideasHub: "Ebe Echiche",
    donations: "Onyinye",
    duesPayment: "Ịkwụ Ụgwọ",
    
    // Navigation - Knowledge
    politicalLiteracy: "Ọgụgụ Ndọrọ Ndọrọ Ọchịchị",
    knowledgeBase: "Ntọala Ihe Ọmụma",
    aboutAPC: "Maka APC",
    
    // Navigation - Monitoring
    situationRoom: "Ụlọ Ọnọdụ",
    eventsGallery: "Gallery Mmemme",
    leadership: "Nduzi",
    
    // Navigation - Settings
    notificationSettings: "Ntọala Ọkwa",
    
    // Navigation - Admin
    analytics: "Nyocha",
    
    // Dashboard
    welcomeBack: "Nnọọ",
    yourPoints: "Isi Akara Gị",
    yourRank: "Ọkwa Gị",
    nationalRank: "Ọkwa Mba",
    stateRank: "Ọkwa Steeti",
    recentActivity: "Ihe Mere N'oge Na-adịbeghị Anya",
    upcomingEvents: "Mmemme Na-abịa",
    latestNews: "Akụkọ Ọhụrụ",
    
    // Points & Rewards Pages
    redeemPoints: "Gbapụta Isi Akara",
    pointBalance: "Ngụkọta Isi Akara",
    earnPoints: "Nweta Isi Akara",
    buyAirtime: "Zụta Airtime",
    buyData: "Zụta Data",
    transactionHistory: "Akụkọ Azụmaahịa",
    pointsAwarded: "Isi Akara Enyere",
    redemptionHistory: "Akụkọ Mgbapụta",
    airtimeTopUp: "Mejupụta Airtime",
    dataTopUp: "Mejupụta Data",
    
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
    
    // Features Section
    features: "Njirimara",
    ninVerification: "Nkwenye NIN",
    electronicVoting: "Ntuli Aka Eletrọniki",
    membershipDues: "Ụgwọ Ndị Otu",
    gamification: "Egwuregwu",
    
    // Feature 1: Join the Party
    featureJoinTitle: "Sonye na Pati, N'ụzọ Gị",
    featureJoinPoint1: "Debanye aha site na nkwenye NIN n'ime nkeji ole na ole",
    featureJoinPoint2: "Kwụọ ụgwọ n'enweghị nsogbu site na ego ekwentị ma ọ bụ kaadị",
    featureJoinPoint3: "Nweta kaadị ID APC dijitalụ gị maka njirimara ozugbo",
    
    // Feature 2: Shape Future
    featureShapeTitle: "Mepụta Ọdịnihu Site na Ọchịchị Onye Kwuo Uche Ya",
    featureShapePoint1: "Kesaa echiche ma votu na iwu ndị dị gị mkpa",
    featureShapePoint2: "Soro nkwa ndị e mere a họpụtara ma mee ka ha rụọ ọrụ",
    featureShapePoint3: "Tinye aka na ntuli aka eletrọniki doro anya",
    
    // Feature 3: Mobilize
    featureMobilizeTitle: "Chịkọtaa Ndị Mmadụ N'ụzọ E Mejughị Mbụ",
    featureMobilizePoint1: "Kesaa mkpọsa na X, WhatsApp na Instagram n'otu aka",
    featureMobilizePoint2: "Duru mmemme na mkpọkọta mpaghara site na ngwaọrụ dị mfe iji",
    featureMobilizePoint3: "Nweta ụgwọ ọrụ maka imecha ọrụ ndị dị obere dịka ịkpọ ndị enyi",
    
    // Feature 4: Elections
    featureElectionsTitle: "Gbakwunye Ike Maka Ntuli Aka",
    featureElectionsPoint1: "Hazie mmemme ndebanye aha ndị ntuli aka na mkpọsa",
    featureElectionsPoint2: "Votu n'enweghị nsogbu na ntuli aka mbụ site na teknụzụ blockchain",
    featureElectionsPoint3: "Soro ntuli aka n'oge n'ezie site n'ụlọ ọnọdụ anyị",
    
    // Feature 5: Youth
    featureYouthTitle: "Tinye aka Dịka Onye Ndu Nwa Okorobịa",
    featureYouthPoint1: "Mụta banyere APC na ndọrọ ndọrọ ọchịchị Naịjirịa site na ajụjụ na-atọ ụtọ",
    featureYouthPoint2: "Jikọọ na ndị nkuzi ma tinye aka na mkpọsa",
    featureYouthPoint3: "Rigo bọọdụ ndekọ ọkwa ma nweta badges maka mmetụta gị",
    
    // How It Works
    howItWorks: "Otu Ọ Si Arụ Ọrụ",
    stepSignUpTitle: "Debanye Aha",
    stepSignUpDesc: "Debanye aha gị site na NIN gị ma sonye na ward mpaghara gị",
    stepEngageTitle: "Tinye Aka",
    stepEngageDesc: "Nyochaa mmemme, kesaa echiche ma tinye aka na ọrụ",
    stepPayDuesTitle: "Kwụọ Ụgwọ",
    stepPayDuesDesc: "Nọrọ na-arụ ọrụ site na ịkwụ ụgwọ dị mfe na nchekwa",
    stepVoteTitle: "Votu & Duru",
    stepVoteDesc: "Tinye aka na ntuli aka mbụ ma mepụta ọdịnihu APC",
    stepMobilizeTitle: "Chịkọtaa",
    stepMobilizeDesc: "Kpọkọtaa obodo gị ma soro mmetụta gị",
    
    // Sections
    whatMembersSay: "Ihe Ndị Otu Anyị Na-ekwu",
    testimonials: "Ama",
    ourImpact: "Mmetụta Anyị N'ofe Naịjirịa",
    selectYourState: "Họrọ Steeti Gị",
    joinYourState: "Sonye na Steeti Gị",
    
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
    
    // Navigation - Core
    dashboard: "Allon Sarrafawa",
    profile: "Bayani",
    news: "Labarai",
    search: "Nema",
    
    // Navigation - Points & Rewards
    myPoints: "Maki Na",
    purchasePoints: "Sayi Maki",
    pointConversion: "Canza Maki",
    userTasks: "Ayyukan Mai Amfani",
    referrals: "Turawa",
    
    // Navigation - Engagement
    tasksAndJobs: "Ayyuka & Aiki",
    rewardsAndBadges: "Lada & Tambura",
    leaderboard: "Allon Matsayi",
    inviteAndEarn: "Gayyata & Sami",
    
    // Navigation - Political
    electionsAndVoting: "Zaɓe & Jefa Ƙuri'a",
    campaigns: "Yaƙin Neman Zaɓe",
    volunteerTasks: "Ayyukan Masu Aikin Sa Kai",
    
    // Navigation - Community
    events: "Abubuwan da Suka Faru",
    ideasHub: "Cibiyar Tunani",
    donations: "Gudummawa",
    duesPayment: "Biyan Kuɗi",
    
    // Navigation - Knowledge
    politicalLiteracy: "Ilimin Siyasa",
    knowledgeBase: "Harshen Ilimi",
    aboutAPC: "Game da APC",
    
    // Navigation - Monitoring
    situationRoom: "Dakin Yanayi",
    eventsGallery: "Gallery Abubuwa",
    leadership: "Jagoranci",
    
    // Navigation - Settings
    notificationSettings: "Saitunan Sanarwa",
    
    // Navigation - Admin
    analytics: "Bincike",
    
    // Dashboard
    welcomeBack: "Barka da Dawowa",
    yourPoints: "Makin Ka",
    yourRank: "Matsayinka",
    nationalRank: "Matsayin Ƙasa",
    stateRank: "Matsayin Jiha",
    recentActivity: "Ayyukan Kwanan Nan",
    upcomingEvents: "Abubuwan da Ke Zuwa",
    latestNews: "Sabbin Labarai",
    
    // Points & Rewards Pages
    redeemPoints: "Karɓi Maki",
    pointBalance: "Ma'aunin Maki",
    earnPoints: "Sami Maki",
    buyAirtime: "Sayi Airtime",
    buyData: "Sayi Data",
    transactionHistory: "Tarihin Ciniki",
    pointsAwarded: "An Ba da Maki",
    redemptionHistory: "Tarihin Fansar",
    airtimeTopUp: "Ƙara Airtime",
    dataTopUp: "Ƙara Data",
    
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
    
    // Features Section
    features: "Fasaloli",
    ninVerification: "Tabbatar da NIN",
    electronicVoting: "Zaɓen Lantarki",
    membershipDues: "Kuɗin Memba",
    gamification: "Wasan Kwaikwayo",
    
    // Feature 1: Join the Party
    featureJoinTitle: "Shiga Jam'iyya, Ta Hanyarka",
    featureJoinPoint1: "Yi rajista tare da tabbatar da NIN cikin 'yan mintuna",
    featureJoinPoint2: "Biya kuɗin memba cikin aminci ta hanyar kuɗin wayar hannu ko kati",
    featureJoinPoint3: "Sami katin ID na APC na dijital don shaidar kai take",
    
    // Feature 2: Shape Future
    featureShapeTitle: "Tsara Makoma Ta Hanyar Mulkin Da Ya Dace",
    featureShapePoint1: "Raba ra'ayoyi kuma ku zaɓa manufofin da suke da mahimmanci a gare ku",
    featureShapePoint2: "Bi alkawuran jami'an da aka zaɓa kuma ku riƙe su da alhakin",
    featureShapePoint3: "Shiga cikin zaɓe na farko na lantarki mai bayyananniya",
    
    // Feature 3: Mobilize
    featureMobilizeTitle: "Tattara Jama'a Kamar Ba A Taɓa Ganin Ba",
    featureMobilizePoint1: "Raba yaƙin neman zaɓe akan X, WhatsApp, da Instagram da danna ɗaya",
    featureMobilizePoint2: "Jagorance abubuwan da suka faru na gida da tarurruka da kayan aiki masu sauƙin amfani",
    featureMobilizePoint3: "Sami lada don kammala ƙananan ayyuka kamar gayyatar abokai",
    
    // Feature 4: Elections
    featureElectionsTitle: "Ƙara Ƙarfi Don Zaɓe",
    featureElectionsPoint1: "Shirya shirye-shiryen rajistar masu zaɓe da yaƙin neman zaɓe",
    featureElectionsPoint2: "Yi zaɓe cikin aminci a zaɓe na farko tare da fasahar blockchain",
    featureElectionsPoint3: "Lura da zaɓe a ainihin lokacin tare da ɗakin yanayi namu",
    
    // Feature 5: Youth
    featureYouthTitle: "Shiga Matsayin Jagoran Matasa",
    featureYouthPoint1: "Koyi game da APC da siyasar Najeriya ta hanyar tambayoyin ban sha'awa",
    featureYouthPoint2: "Haɗu da masu koyarwa kuma ku yi aikin sa kai don yaƙin neman zaɓe",
    featureYouthPoint3: "Hau allunan matsayi kuma ku sami lambobin yabo don tasirinku",
    
    // How It Works
    howItWorks: "Yadda Yake Aiki",
    stepSignUpTitle: "Yi Rajista",
    stepSignUpDesc: "Yi rajista tare da NIN ɗinka kuma ku shiga unguwanni na gida",
    stepEngageTitle: "Shiga",
    stepEngageDesc: "Bincika abubuwan da suka faru, raba ra'ayoyi, kuma ku yi aikin sa kai don ayyuka",
    stepPayDuesTitle: "Biya Kuɗi",
    stepPayDuesDesc: "Kasance mai aiki tare da sauƙi, biyan kuɗi cikin aminci",
    stepVoteTitle: "Zaɓa & Jagoranci",
    stepVoteDesc: "Shiga zaɓe na farko kuma ku tsara makomar APC",
    stepMobilizeTitle: "Tattara",
    stepMobilizeDesc: "Tattara al'ummarku kuma ku bi tasirinku",
    
    // Sections
    whatMembersSay: "Abin da Membobinmu Suke Faɗi",
    testimonials: "Shaidun",
    ourImpact: "Tasirinmu A Duk Najeriya",
    selectYourState: "Zaɓi Jihar Ka",
    joinYourState: "Shiga Jihar Ka",
    
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
    
    // Navigation - Core
    dashboard: "Pátákó Iṣakoso",
    profile: "Profaili",
    news: "Iroyin",
    search: "Wa",
    
    // Navigation - Points & Rewards
    myPoints: "Awọn Aami Mi",
    purchasePoints: "Ra Aami",
    pointConversion: "Iyipada Aami",
    userTasks: "Awọn Iṣẹ Olumulo",
    referrals: "Awọn Itọkasi",
    
    // Navigation - Engagement
    tasksAndJobs: "Awọn Iṣẹ & Iṣẹ",
    rewardsAndBadges: "Awọn Ẹsan & Ami",
    leaderboard: "Pátákó Ipele",
    inviteAndEarn: "Pe & Jere",
    
    // Navigation - Political
    electionsAndVoting: "Idibo & Dibo",
    campaigns: "Awọn Ipolongo",
    volunteerTasks: "Awọn Iṣẹ Oluranlọwọ",
    
    // Navigation - Community
    events: "Awọn Iṣẹlẹ",
    ideasHub: "Ile-iṣẹ Imọ",
    donations: "Awọn Ẹbun",
    duesPayment: "Sisanwo Owo",
    
    // Navigation - Knowledge
    politicalLiteracy: "Imọ Iṣelu",
    knowledgeBase: "Ipilẹ Imọ",
    aboutAPC: "Nipa APC",
    
    // Navigation - Monitoring
    situationRoom: "Yara Ipo",
    eventsGallery: "Galari Awọn Iṣẹlẹ",
    leadership: "Idari",
    
    // Navigation - Settings
    notificationSettings: "Eto Ifitọnileti",
    
    // Navigation - Admin
    analytics: "Itupalẹ",
    
    // Dashboard
    welcomeBack: "Káàbọ̀",
    yourPoints: "Awọn Aami Rẹ",
    yourRank: "Ipo Rẹ",
    nationalRank: "Ipo Orilẹ-ede",
    stateRank: "Ipo Ipinlẹ",
    recentActivity: "Iṣẹ Aipẹ",
    upcomingEvents: "Awọn Iṣẹlẹ Ti Nbọ",
    latestNews: "Iroyin Tuntun",
    
    // Points & Rewards Pages
    redeemPoints: "Ra Awọn Aami Pada",
    pointBalance: "Iwọntunwọnsi Aami",
    earnPoints: "Jere Awọn Aami",
    buyAirtime: "Ra Airtime",
    buyData: "Ra Data",
    transactionHistory: "Itan-akọọlẹ Iṣowo",
    pointsAwarded: "Awọn Aami Ti A Fun",
    redemptionHistory: "Itan Ipada",
    airtimeTopUp: "Fikun Airtime",
    dataTopUp: "Fikun Data",
    
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
    
    // Features Section
    features: "Awọn Ẹya",
    ninVerification: "Ijẹrisi NIN",
    electronicVoting: "Idibo Itanna",
    membershipDues: "Gbese Ọmọ Ẹgbẹ",
    gamification: "Ere Idaraya",
    
    // Feature 1: Join the Party
    featureJoinTitle: "Darapọ Ẹgbẹ, Ni Ọna Tirẹ",
    featureJoinPoint1: "Forukọsilẹ pẹlu ijẹrisi NIN laarin iṣẹju diẹ",
    featureJoinPoint2: "San gbese ni aabo nipasẹ owo foonu tabi kaadi",
    featureJoinPoint3: "Gba kaadi ID APC oni-nọmba rẹ fun idanimọ lẹsẹkẹsẹ",
    
    // Feature 2: Shape Future
    featureShapeTitle: "Ṣe Ọjọ Iwaju Pẹlu Ijọba Ti O Peye",
    featureShapePoint1: "Pin awọn ero ki o si dibo lori awọn ilana ti o ṣe pataki si ọ",
    featureShapePoint2: "Tọpa awọn ileri awọn aṣofin ti a yan ki o si mu wọn ni iduroṣinṣin",
    featureShapePoint3: "Kopa ninu awọn idibo akọkọ itanna ti o han gbangba",
    
    // Feature 3: Mobilize
    featureMobilizeTitle: "Gbe Awọn Eniyan Bi Ko Ti Ṣẹlẹ Tẹlẹ",
    featureMobilizePoint1: "Pin awọn ipolongo lori X, WhatsApp, ati Instagram pẹlu titẹ kan",
    featureMobilizePoint2: "Ṣaṣaju awọn iṣẹlẹ agbegbe ati awọn ipade pẹlu awọn irinṣẹ ti o rọrun lati lo",
    featureMobilizePoint3: "Jere awọn ẹbun fun ipari awọn iṣẹ kekere bi pipe awọn ọrẹ",
    
    // Feature 4: Elections
    featureElectionsTitle: "Mu Agbara Fun Awọn Idibo",
    featureElectionsPoint1: "Ṣeto awọn ikojọpọ iforukọsilẹ olùdìbò ati ipolongo",
    featureElectionsPoint2: "Dibo ni aabo ninu awọn idibo akọkọ pẹlu imọ-ẹrọ blockchain",
    featureElectionsPoint3: "Ṣe abojuto awọn idibo ni akoko gidi pẹlu yara ipo wa",
    
    // Feature 5: Youth
    featureYouthTitle: "Kopa Bi Oludari Ọdọ",
    featureYouthPoint1: "Kọ ẹkọ nipa APC ati iṣelu Naijiria nipasẹ awọn ibeere igbadun",
    featureYouthPoint2: "Sopọ pẹlu awọn olùkọ ati ṣiṣẹ ifọwọsi fun awọn ipolongo",
    featureYouthPoint3: "Gun awọn pátákó ipele ki o si jere awọn ami fun ipa rẹ",
    
    // How It Works
    howItWorks: "Bawo Ni O Ṣe N Ṣiṣẹ",
    stepSignUpTitle: "Forukọsilẹ",
    stepSignUpDesc: "Forukọsilẹ pẹlu NIN rẹ ki o si darapọ adagba agbegbe rẹ",
    stepEngageTitle: "Kopa",
    stepEngageDesc: "Ṣawari awọn iṣẹlẹ, pin awọn ero, ki o si ṣe ifọwọsi fun awọn iṣẹ",
    stepPayDuesTitle: "San Gbese",
    stepPayDuesDesc: "Duro ni iṣẹ pẹlu isanwo ti o rọrun ati aabo",
    stepVoteTitle: "Dibo & Ṣaṣaju",
    stepVoteDesc: "Kopa ninu awọn idibo akọkọ ki o si ṣe ọjọ iwaju APC",
    stepMobilizeTitle: "Gbe Awọn Eniyan",
    stepMobilizeDesc: "Pe agbegbe rẹ pọ ki o si tọpa ipa rẹ",
    
    // Sections
    whatMembersSay: "Ohun Ti Awọn Ọmọ Ẹgbẹ Wa N Sọ",
    testimonials: "Awọn Ẹri",
    ourImpact: "Ipa Wa Ni Gbogbo Naijiria",
    selectYourState: "Yan Ipinlẹ Rẹ",
    joinYourState: "Darapọ Ipinlẹ Rẹ",
    
    // Footer
    aboutUs: "Nipa Wa",
    contactUs: "Kan Si Wa",
    privacyPolicy: "Ilana Aṣiri",
    termsOfService: "Awọn Ofin Iṣẹ",
    followUs: "Tẹle Wa",
    copyright: "© 2024 All Progressives Congress. Gbogbo Ẹtọ Ni Ipamọ.",
  },
};
