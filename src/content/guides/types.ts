export interface GuideSection {
  id: string;
  title: string;
  paragraphs: string[];
  table?: {
    caption: string;
    headings: string[];
    rows: string[][];
  };
  sources?: { label: string; href: string }[];
}

export interface GuideArticle {
  introduction: string;
  sections: GuideSection[];
  takeaway: string;
}
