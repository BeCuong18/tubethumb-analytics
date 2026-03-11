
export interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  channelId: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  publishedAt: string;
  duration?: string;
  tags?: string[];
  viewCountRaw?: number;
  likeCountRaw?: number;
  commentCountRaw?: number;
  categoryId?: string;
  engagementRate?: string;
  definition?: string;
  caption?: string;
  licensedContent?: boolean;
  projection?: string;
  defaultAudioLanguage?: string;
  defaultLanguage?: string;
  topicCategories?: string[];
  madeForKids?: boolean;
  embeddable?: boolean;
  publicStatsViewable?: boolean;
  recordingLocation?: string;
  contentRating?: any;
  license?: string;
  subscriberCount?: string;
  vph?: number;
}

export enum SortBy {
  VIEWS = 'VIEWS',
  DATE_DESC = 'DATE_DESC',
  DATE_ASC = 'DATE_ASC',
  VPH = 'VPH'
}

export interface RisingKeyword {
  term: string;
  volume: string;
  change: string;
  isUp: boolean;
  topic: string;
  country: string;
}

export interface KeywordOpportunity {
  term: string;
  score: number;
  reason: string;
  topic: string;
  country: string;
}

export interface KeywordAnalysisSource {
  title: string;
  uri: string;
}

export interface KeywordAnalysisResult {
  searchTerm: string;
  overallScore: number;
  volume: number;
  competition: number;
  highestViews: number;
  avgViews: number;
  avgSubscribers?: string;
  addedLast7Days: string;
  ccCount: string;
  avgAge: string;
  timesInTitle: string;
  timesInDesc: string;
  topCreator: string;
  topChannels: { name: string; subscriberCount: string; avatar?: string }[];
  relatedKeywords: { term: string; score: number }[];
  risingKeywords: RisingKeyword[];
  topOpportunities: KeywordOpportunity[];
  sources?: KeywordAnalysisSource[]; // Thêm nguồn trích dẫn từ Google Search
}

export interface SavedAnalysis {
  video: VideoData;
  analysis: SingleVideoAnalysis | null;
  savedAt: string;
}

export interface SeoAnalysisResult {
  titleAnalysis: string;
  keywordStrategy: string;
  descriptionInsights: string;
  tagUsage: string;
  viralTriggers: string;
  improvements: string;
}

export interface ThumbnailAnalysisResult {
  designStyle: string;
  emotionalAppeal: string;
  layoutComposition: string;
  colorAndLighting: string;
  typography: string;
  standoutElements: string;
  improvements: string;
  designProposals?: {
    styleName: string;
    background: string;
    textOverlay: string;
    layoutExample: string;
    imagePrompt?: string;
    imageUrl?: string;
  }[];
}

export interface ChannelAnalysisResult {
  channelStrengths: string;
  channelWeaknesses: string;
  contentStrategyGap: string;
  actionableAdvice: string;
}

export interface SingleVideoAnalysis {
  performanceVerdict: string;
  audienceHook: string;
  retentionStrategy: string;
  growthPotential: string;
  predictedDemographics: {
    ageGroups: string;
    genderDistribution: string;
    targetLocations: string;
  };
  thumbnailAnalysis?: {
    strengths: string;
    weaknesses: string;
    emotionalTriggers: string;
    textAnalysis: string;
    composition: string;
    improvementSuggestions: string[];
    designProposals?: {
      styleName: string; // e.g., "Gây sốc/Cảm xúc", "Tối giản/Hiện đại", "Kể chuyện/Drama"
      background: string;
      textOverlay: string;
      layoutExample: string;
      imagePrompt?: string;
      imageUrl?: string;
    }[];
  };
  copyrightDetails?: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  GENERATING_KEYWORDS = 'GENERATING_KEYWORDS',
  FETCHING_VIDEOS = 'FETCHING_VIDEOS',
  ANALYZING_SEO = 'ANALYZING_SEO',
  ANALYZING_THUMB = 'ANALYZING_THUMB',
  ANALYZING_CHANNEL = 'ANALYZING_CHANNEL',
  ANALYZING_SINGLE = 'ANALYZING_SINGLE',
  ANALYZING_KEYWORD = 'ANALYZING_KEYWORD',
  ERROR = 'ERROR'
}

export enum SearchMode {
  KEYWORDS = 'KEYWORDS',
  CHANNELS = 'CHANNELS',
  VIDEO_IDS = 'VIDEO_IDS',
  PLAYLIST = 'PLAYLIST'
}

export const COUNTRIES = [
  { code: 'ALL', name: 'Trên toàn thế giới' },
  { code: 'VN', name: 'Việt Nam' },
  { code: 'US', name: 'Hoa Kỳ' },
  { code: 'GB', name: 'Anh Quốc' },
  { code: 'KR', name: 'Hàn Quốc' },
  { code: 'JP', name: 'Nhật Bản' },
  { code: 'CN', name: 'Trung Quốc' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Úc' },
  { code: 'DE', name: 'Đức' },
  { code: 'FR', name: 'Pháp' },
  { code: 'IT', name: 'Ý' },
  { code: 'ES', name: 'Tây Ban Nha' },
  { code: 'RU', name: 'Nga' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'Ấn Độ' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thái Lan' },
  { code: 'PH', name: 'Philippines' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TW', name: 'Đài Loan' },
  { code: 'HK', name: 'Hồng Kông' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua và Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AT', name: 'Áo' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Bỉ' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia và Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KH', name: 'Campuchia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CF', name: 'Cộng hòa Trung Phi' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Síp' },
  { code: 'CZ', name: 'Cộng hòa Séc' },
  { code: 'DK', name: 'Đan Mạch' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Cộng hòa Dominica' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Ai Cập' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Guinea Xích đạo' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Phần Lan' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Gruzia' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Hy Lạp' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KP', name: 'Triều Tiên' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Lào' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Libang' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Litva' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Quần đảo Marshall' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mông Cổ' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Maroc' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Hà Lan' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'Bắc Macedonia' },
  { code: 'NO', name: 'Na Uy' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PL', name: 'Ba Lan' },
  { code: 'PT', name: 'Bồ Đào Nha' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts và Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent và Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome và Principe' },
  { code: 'SA', name: 'Ả Rập Xê Út' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Quần đảo Solomon' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'Nam Phi' },
  { code: 'SS', name: 'Nam Sudan' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Thụy Điển' },
  { code: 'CH', name: 'Thụy Sĩ' },
  { code: 'SY', name: 'Syria' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad và Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Thổ Nhĩ Kỳ' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraina' },
  { code: 'AE', name: 'Các Tiểu vương quốc Ả Rập Thống nhất' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

export const TIMEFRAMES = [
  { value: 0.0416, label: '1 giờ qua' },
  { value: 1, label: '24 giờ qua' },
  { value: 7, label: '7 ngày qua' },
  { value: 30, label: '30 ngày qua' },
  { value: 90, label: '90 ngày qua' },
  { value: 365, label: '12 tháng qua' },
  { value: 3650, label: 'Tất cả' },
];

export const YOUTUBE_CATEGORIES = [
  { id: 'ALL', name: 'Tất cả danh mục' },
  { id: '1', name: 'Phim & Hoạt ảnh' },
  { id: '2', name: 'Ô tô & Xe cộ' },
  { id: '10', name: 'Âm nhạc' },
  { id: '15', name: 'Động vật' },
  { id: '17', name: 'Thể thao' },
  { id: '19', name: 'Du lịch & Sự kiện' },
  { id: '20', name: 'Trò chơi' },
  { id: '22', name: 'Mọi người & Blog' },
  { id: '23', name: 'Hài kịch' },
  { id: '24', name: 'Giải trí' },
  { id: '25', name: 'Tin tức & Chính trị' },
  { id: '26', name: 'Mẹo & Phong cách' },
  { id: '27', name: 'Giáo dục' },
  { id: '28', name: 'Khoa học & Công nghệ' },
  { id: '29', name: 'Hoạt động & Tổ chức' },
];

export const GEMINI_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
];

declare global {
  interface Window {
    electronAPI: {
      getMachineId: () => Promise<string>;
      getAppVersion: () => Promise<string>;
      checkForUpdates: () => Promise<void>;
      reloadApp: () => Promise<void>;
    };
  }
}
