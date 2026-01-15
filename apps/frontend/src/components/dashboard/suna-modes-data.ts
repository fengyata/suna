export type SunaModeId = 'image' | 'slides' | 'data' | 'docs' | 'canvas' | 'video' | 'research';

export type SunaSamplePrompt = {
  text: string;
  thumbnail?: string;
};

export type SunaModeOptions = {
  title: string;
  items: Array<{
    id: string;
    name: string;
    image?: string;
    description?: string;
    icon?: string;
  }>;
};

export type SunaModeChartTypes = {
  title: string;
  items: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
  }>;
};

export type SunaMode = {
  id: SunaModeId;
  label: string;
  isVisual?: boolean;
  samplePrompts: SunaSamplePrompt[];
  options?: SunaModeOptions;
  chartTypes?: SunaModeChartTypes;
};

export const sunaModes: SunaMode[] = [
  {
    id: 'slides',
    label: 'Slides',
    isVisual: true,
    samplePrompts: [
      { text: 'Create a Series A pitch deck with market size, traction, and financial projections', thumbnail: '/images/presentation-templates/startup-min.png' },
      { text: 'Build a Q4 business review showcasing KPIs, wins, and strategic initiatives', thumbnail: '/images/presentation-templates/numbers_colorful-min.png' },
      { text: 'Design a product launch presentation with demo videos and customer testimonials', thumbnail: '/images/presentation-templates/colorful-min.png' },
      { text: 'Develop a sales enablement deck explaining our value prop and competitive advantages', thumbnail: '/images/presentation-templates/minimalist-min.png' },
      { text: 'Create an investor update highlighting key metrics and upcoming milestones', thumbnail: '/images/presentation-templates/numbers_clean-min.png' },
      { text: 'Build a customer case study presentation showing ROI and success metrics', thumbnail: '/images/presentation-templates/competitor_analysis_blue-min.png' },
      { text: 'Design an all-hands presentation covering company updates and vision', thumbnail: '/images/presentation-templates/premium_black-min.png' },
      { text: 'Develop a training deck for new product features and workflows', thumbnail: '/images/presentation-templates/textbook-min.png' },
      { text: 'Create a conference talk about scaling engineering teams', thumbnail: '/images/presentation-templates/architect-min.png' },
      { text: 'Build a board meeting presentation with strategic recommendations', thumbnail: '/images/presentation-templates/professor_gray-min.png' },
    ],
    options: {
      title: 'Choose a template',
      items: [
        { id: 'minimalist', name: 'Minimalist', description: 'Clean and simple design', image: '/images/presentation-templates/minimalist-min.png' },
        { id: 'minimalist_2', name: 'Minimalist 2', description: 'Alternative minimal style', image: '/images/presentation-templates/minimalist_2-min.png' },
        { id: 'black_and_white_clean', name: 'Black & White', description: 'Classic monochrome', image: '/images/presentation-templates/black_and_white_clean-min.png' },
        { id: 'colorful', name: 'Colorful', description: 'Vibrant and energetic', image: '/images/presentation-templates/colorful-min.png' },
        { id: 'startup', name: 'Startup', description: 'Dynamic and innovative', image: '/images/presentation-templates/startup-min.png' },
        { id: 'elevator_pitch', name: 'Elevator Pitch', description: 'Quick and impactful', image: '/images/presentation-templates/elevator_pitch-min.png' },
        { id: 'portfolio', name: 'Portfolio', description: 'Showcase your work', image: '/images/presentation-templates/portfolio-min.png' },
        { id: 'textbook', name: 'Textbook', description: 'Educational and structured', image: '/images/presentation-templates/textbook-min.png' },
        { id: 'architect', name: 'Architect', description: 'Professional and precise', image: '/images/presentation-templates/architect-min.png' },
        { id: 'hipster', name: 'Hipster', description: 'Modern and trendy', image: '/images/presentation-templates/hipster-min.png' },
        { id: 'green', name: 'Green', description: 'Nature-inspired design', image: '/images/presentation-templates/green-min.png' },
        { id: 'premium_black', name: 'Premium Black', description: 'Luxury dark theme', image: '/images/presentation-templates/premium_black-min.png' },
        { id: 'premium_green', name: 'Premium Green', description: 'Sophisticated green', image: '/images/presentation-templates/premium_green-min.png' },
        { id: 'professor_gray', name: 'Professor Gray', description: 'Academic and scholarly', image: '/images/presentation-templates/professor_gray-min.png' },
        { id: 'gamer_gray', name: 'Gamer Gray', description: 'Gaming-inspired design', image: '/images/presentation-templates/gamer_gray-min.png' },
        { id: 'competitor_analysis_blue', name: 'Analysis Blue', description: 'Business analysis focused', image: '/images/presentation-templates/competitor_analysis_blue-min.png' },
        { id: 'numbers_clean', name: 'Numbers Clean', description: 'Clean data visualization', image: '/images/presentation-templates/numbers_clean-min.png' },
        { id: 'numbers_colorful', name: 'Numbers Colorful', description: 'Vibrant data presentation', image: '/images/presentation-templates/numbers_colorful-min.png' },
      ],
    },
  },
  {
    id: 'data',
    label: 'Data',
    isVisual: true,
    samplePrompts: [
      { text: 'Build a financial model projecting ARR growth with different pricing scenarios', thumbnail: '/images/landing-showcase/data.png' },
      { text: 'Create an interactive sales dashboard tracking metrics by region and quarter', thumbnail: '/images/landing-showcase/data.png' },
      { text: 'Analyze 50K customer reviews and visualize sentiment trends over time', thumbnail: '/images/landing-showcase/data.png' },
      { text: 'Design a content calendar tracking campaigns with ROI and engagement charts', thumbnail: '/images/landing-showcase/data.png' },
      { text: 'Build a cohort analysis showing user retention and churn patterns', thumbnail: '/images/landing-showcase/data.png' },
      { text: 'Create a marketing attribution model comparing channel performance', thumbnail: '/images/landing-showcase/data.png' },
      { text: 'Develop a hiring tracker with pipeline metrics and time-to-fill analysis', thumbnail: '/images/landing-showcase/data.png' },
      { text: 'Build a budget planning spreadsheet with scenario modeling', thumbnail: '/images/landing-showcase/data.png' },
      { text: 'Analyze website traffic data and visualize conversion funnels', thumbnail: '/images/landing-showcase/data.png' },
      { text: 'Create an inventory management system with automated reorder alerts', thumbnail: '/images/landing-showcase/data.png' },
    ],
    options: {
      title: 'Choose output format',
      items: [
        { id: 'spreadsheet', name: 'Spreadsheet', description: 'Table with formulas', icon: 'table' },
        { id: 'dashboard', name: 'Dashboard', description: 'Interactive charts', icon: 'dashboard' },
        { id: 'report', name: 'Report', description: 'Analysis with visuals', icon: 'report' },
        { id: 'slides', name: 'Slides', description: 'Presentation format', icon: 'presentation' },
      ],
    },
    chartTypes: {
      title: 'Preferred charts',
      items: [
        { id: 'bar', name: 'Bar', description: 'Vertical bar chart', icon: 'barChart' },
        { id: 'line', name: 'Line', description: 'Line chart', icon: 'trendingUp' },
        { id: 'pie', name: 'Pie', description: 'Pie chart', icon: 'pieChart' },
        { id: 'scatter', name: 'Scatter', description: 'Scatter plot', icon: 'circleDot' },
        { id: 'heatmap', name: 'Heat map', description: 'Heat map', icon: 'grid' },
        { id: 'bubble', name: 'Bubble', description: 'Bubble chart', icon: 'circle' },
        { id: 'wordcloud', name: 'Word cloud', description: 'Word cloud visualization', icon: 'cloud' },
        { id: 'stacked', name: 'Stacked bar', description: 'Stacked bar chart', icon: 'layers' },
        { id: 'area', name: 'Area', description: 'Area chart', icon: 'areaChart' },
      ],
    },
  },
  {
    id: 'docs',
    label: 'Docs',
    isVisual: true,
    samplePrompts: [
      { text: 'Write a comprehensive PRD for an AI-powered recommendation engine', thumbnail: '/images/landing-showcase/docs.png' },
      { text: 'Draft a technical architecture document for a scalable microservices platform', thumbnail: '/images/landing-showcase/docs.png' },
      { text: 'Create a go-to-market strategy document for our Q2 product launch', thumbnail: '/images/landing-showcase/docs.png' },
      { text: 'Develop a 90-day onboarding playbook for engineering managers', thumbnail: '/images/landing-showcase/docs.png' },
      { text: 'Write an API documentation guide with examples and best practices', thumbnail: '/images/landing-showcase/docs.png' },
      { text: 'Create a company handbook covering culture, policies, and benefits', thumbnail: '/images/landing-showcase/docs.png' },
      { text: 'Draft a data privacy policy compliant with GDPR and CCPA', thumbnail: '/images/landing-showcase/docs.png' },
      { text: 'Develop a customer success playbook for SaaS enterprise accounts', thumbnail: '/images/landing-showcase/docs.png' },
      { text: 'Write a security incident response plan with escalation procedures', thumbnail: '/images/landing-showcase/docs.png' },
      { text: 'Create a comprehensive style guide for brand and content', thumbnail: '/images/landing-showcase/docs.png' },
    ],
    options: {
      title: 'Choose a template',
      items: [
        { id: 'prd', name: 'PRD', description: 'Product requirements document', icon: 'fileText' },
        { id: 'technical', name: 'Technical', description: 'Technical documentation', icon: 'fileCode' },
        { id: 'proposal', name: 'Proposal', description: 'Business proposal', icon: 'lightbulb' },
        { id: 'report', name: 'Report', description: 'Detailed report format', icon: 'fileBarChart' },
        { id: 'guide', name: 'Guide', description: 'Step-by-step guide', icon: 'bookOpen' },
        { id: 'wiki', name: 'Wiki', description: 'Knowledge base article', icon: 'bookMarked' },
        { id: 'policy', name: 'Policy', description: 'Policy document', icon: 'scale' },
        { id: 'meeting-notes', name: 'Meeting Notes', description: 'Meeting minutes', icon: 'users' },
      ],
    },
  },
  {
    id: 'canvas',
    label: 'Canvas',
    isVisual: true,
    samplePrompts: [
      { text: 'Add a tech startup banner to canvas with futuristic city skyline', thumbnail: '/images/image-styles/digital_art_cyberpunk-min.png' },
      { text: 'Create a coffee brand logo on canvas using earthy minimalist style', thumbnail: '/images/image-styles/minimalist_coffee-min.png' },
      { text: 'Add my product photo to canvas and remove its background', thumbnail: '/images/canvas/remove-bg.png' },
      { text: 'Design a renewable energy infographic on canvas with flat icons', thumbnail: '/images/image-styles/geometric_crystal-min.png' },
      { text: 'Create a sci-fi book cover on canvas with cyberpunk aesthetics', thumbnail: '/images/image-styles/neon_jellyfish-min.png' },
      { text: 'Add a YouTube thumbnail to canvas for productivity tips video', thumbnail: '/images/canvas/create.png' },
      { text: 'Build a luxury fashion mood board on canvas for millennials', thumbnail: '/images/image-styles/pastel_landscape-min.png' },
      { text: 'Design an elegant wedding invitation on canvas with floral patterns', thumbnail: '/images/image-styles/watercolor_garden-min.png' },
      { text: 'Add my portrait to canvas and apply vintage film effect', thumbnail: '/images/image-styles/vintage_diner-min.png' },
      { text: 'Create a music festival poster on canvas with psychedelic vibes', thumbnail: '/images/image-styles/abstract_organic-min.png' },
    ],
    options: {
      title: 'Choose canvas action',
      items: [
        { id: 'create', name: 'Create New', description: 'Generate from scratch', icon: 'sparkles' },
        { id: 'edit', name: 'Edit Image', description: 'Modify existing images', icon: 'pencil' },
        { id: 'upscale', name: 'Upscale', description: 'Enhance and improve', icon: 'maximize' },
        { id: 'remove-bg', name: 'Remove BG', description: 'Remove background', icon: 'scissors' },
      ],
    },
  },
  {
    id: 'video',
    label: 'Video',
    isVisual: true,
    samplePrompts: [
      { text: 'Animate my product photo rotating smoothly with studio lighting', thumbnail: '/images/video-styles/product.png' },
      { text: 'Transform my portrait into a cinematic scene with camera movement', thumbnail: '/images/video-styles/cinematic.png' },
      { text: 'Generate a peaceful nature video of cherry blossoms falling slowly', thumbnail: '/images/video-styles/nature.png' },
      { text: 'Create abstract glowing particles swirling together in slow motion', thumbnail: '/images/video-styles/abstract.png' },
      { text: 'Make my product float and rotate with soft shadows and reflections', thumbnail: '/images/video-styles/product.png' },
      { text: 'Add dramatic cinematic lighting and color grading to my portrait', thumbnail: '/images/video-styles/person.png' },
      { text: 'Generate a smooth drone shot flying through foggy mountain peaks', thumbnail: '/images/video-styles/nature.png' },
      { text: 'Create a looping video of liquid metal flowing into organic shapes', thumbnail: '/images/video-styles/abstract.png' },
      { text: 'Transform my photo background into an underwater scene with light rays', thumbnail: '/images/video-styles/animation.png' },
      { text: 'Generate a futuristic cityscape video with neon lights and reflections', thumbnail: '/images/video-styles/cinematic.png' },
    ],
    options: {
      title: 'Choose video style',
      items: [
        { id: 'cinematic', name: 'Cinematic', description: 'Film-like quality', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/video-styles/cinematic.jpg' },
        { id: 'product', name: 'Product', description: 'Clean product showcase', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/video-styles/product.jpg' },
        { id: 'animation', name: 'Animation', description: 'Animated graphics', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/video-styles/animation.jpg' },
        { id: 'nature', name: 'Nature', description: 'Natural scenes', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/video-styles/nature.jpg' },
        { id: 'abstract', name: 'Abstract', description: 'Creative patterns', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/video-styles/abstract.jpg' },
        { id: 'adventure', name: 'Adventure', description: 'Transform your world', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/video-styles/person.jpg' },
      ],
    },
  },
  {
    id: 'research',
    label: 'Research',
    isVisual: true,
    samplePrompts: [
      { text: 'Analyze emerging trends in quantum computing and potential business applications', thumbnail: '/images/landing-showcase/research.png' },
      { text: 'Research top 10 competitors in the AI-powered CRM space with feature comparison', thumbnail: '/images/landing-showcase/research.png' },
      { text: 'Investigate regulatory requirements for launching a fintech app in the EU', thumbnail: '/images/landing-showcase/research.png' },
      { text: 'Compile market analysis on electric vehicle adoption rates across major markets', thumbnail: '/images/landing-showcase/research.png' },
      { text: 'Study the impact of remote work on commercial real estate demand in major cities', thumbnail: '/images/landing-showcase/research.png' },
      { text: 'Research Web3 adoption patterns among Fortune 500 companies', thumbnail: '/images/landing-showcase/research.png' },
      { text: 'Analyze consumer sentiment towards sustainable fashion brands', thumbnail: '/images/landing-showcase/research.png' },
      { text: 'Investigate the latest developments in gene therapy for rare diseases', thumbnail: '/images/landing-showcase/research.png' },
      { text: 'Study pricing strategies of successful D2C subscription box companies', thumbnail: '/images/landing-showcase/research.png' },
      { text: 'Research the competitive landscape of AI-powered cybersecurity solutions', thumbnail: '/images/landing-showcase/research.png' },
    ],
  },
  {
    id: 'image',
    label: 'Image',
    isVisual: true,
    samplePrompts: [
      { text: 'A majestic golden eagle soaring through misty mountain peaks at sunrise with dramatic lighting', thumbnail: '/images/image-styles/photorealistic_eagle-min.png' },
      { text: 'Close-up portrait of a fashion model with avant-garde makeup, studio lighting, high contrast shadows', thumbnail: '/images/image-styles/vintage_diner-min.png' },
      { text: 'Cozy Scandinavian living room with natural wood furniture, indoor plants, and soft morning sunlight', thumbnail: '/images/image-styles/isometric_bedroom-min.png' },
      { text: 'Futuristic cyberpunk street market at night with neon signs, rain-slicked pavement, and holographic displays', thumbnail: '/images/image-styles/digital_art_cyberpunk-min.png' },
      { text: 'Elegant product photography of luxury perfume bottle on marble surface with soft reflections', thumbnail: '/images/image-styles/minimalist_coffee-min.png' },
      { text: 'Whimsical floating islands connected by rope bridges in a pastel sky with dreamy clouds', thumbnail: '/images/image-styles/surreal_islands-min.png' },
      { text: 'Macro close-up of morning dew drops on vibrant flower petals with bokeh background', thumbnail: '/images/image-styles/watercolor_garden-min.png' },
      { text: 'Modern workspace desk setup with laptop, coffee, notebook, and succulent plants from above', thumbnail: '/images/image-styles/minimalist_coffee-min.png' },
      { text: 'Mystical forest path with ancient trees, glowing fireflies, and ethereal light beams through fog', thumbnail: '/images/image-styles/anime_forest-min.png' },
      { text: 'Architectural detail of contemporary glass building facade with geometric patterns and reflections', thumbnail: '/images/image-styles/geometric_crystal-min.png' },
      { text: 'Vibrant street food vendor stall with colorful ingredients, steam rising, and warm lighting', thumbnail: '/images/image-styles/oil_painting_villa-min.png' },
      { text: 'Serene Japanese zen garden with raked sand, moss-covered stones, and cherry blossom petals', thumbnail: '/images/image-styles/impressionist_garden-min.png' },
      { text: 'Dynamic action shot of athlete mid-jump against dramatic sunset sky, silhouette effect', thumbnail: '/images/image-styles/comic_book_robot-min.png' },
      { text: 'Rustic farmhouse kitchen with copper pots, fresh herbs, wooden cutting boards, and natural textures', thumbnail: '/images/image-styles/oil_painting_villa-min.png' },
      { text: 'Abstract fluid art with swirling metallic gold, deep blue, and emerald green organic patterns', thumbnail: '/images/image-styles/abstract_organic-min.png' },
    ],
    options: {
      title: 'Choose a style',
      items: [
        { id: 'photorealistic', name: 'Photorealistic', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/image-styles/Realistic.jpg' },
        { id: 'watercolor', name: 'Watercolor', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/image-styles/Watercolor.jpg' },
        { id: 'digital-art', name: 'Digital Art', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/image-styles/DigitalArt.jpg' },
        { id: 'oil-painting', name: 'Oil Painting', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/image-styles/OilPainting.jpg' },
        { id: 'minimalist', name: 'Minimalist', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/image-styles/Minimalist.jpg' },
        { id: 'isometric', name: 'Isometric', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/image-styles/Isometric.jpg' },
        { id: 'vintage', name: 'Vintage', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/image-styles/Vintage.jpg' },
        { id: 'comic', name: 'Comic Book', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/image-styles/ComicBook.jpg' },
        { id: 'neon', name: 'Neon', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/image-styles/Neon.jpg' },
        { id: 'geometric', name: 'Geometric', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/image-styles/Geometric.jpg' },
        { id: 'abstract', name: 'Abstract', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/image-styles/Abstract.jpg' },
        { id: 'anime', name: 'Anime', image: 'https://sitemap-1305356416.cos.na-siliconvalley.myqcloud.com/super-agent/image-styles/Anime.jpg' },
      ],
    },
  },
];

