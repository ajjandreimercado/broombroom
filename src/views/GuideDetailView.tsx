import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ArrowLeft, Clock, Share2, BookOpen, ArrowRight } from 'lucide-react';

export const GuideDetailView: React.FC = () => {
  const { guides, selectedGuideSlug, navigateTo, showToast } = useApp();

  const guide = guides.find((g) => g.slug === selectedGuideSlug) || guides[0];

  if (!guide) {
    return (
      <div className="min-h-screen bg-[#F7F8F8] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-base font-semibold text-[#141517]">Guide not found</p>
          <button
            onClick={() => navigateTo('guides')}
            className="mt-4 px-5 py-2.5 bg-[#141517] text-white rounded-[2px] text-xs font-semibold hover:bg-[#2A2E31] transition-colors cursor-pointer"
          >
            Back to Guides
          </button>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link Copied', 'Guide article URL copied to clipboard.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F8] pb-24">
      {/* Top Breadcrumb Navigation */}
      <div className="sticky top-[65px] z-20 bg-[#F7F8F8] border-b border-[#C9D1D6]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigateTo('guides')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#2A2E31] hover:text-[#141517] transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#4E585E] group-hover:-translate-x-0.5 transition-transform" />
            <span>All Guides</span>
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-medium text-[#2A2E31] bg-white border border-[#C9D1D6] hover:border-[#141517] hover:text-[#141517] transition-colors cursor-pointer"
            title="Share article"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="border-t-2 border-[#141517] pt-6 space-y-8">
          {/* Header Metadata */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="px-2.5 py-1 rounded-[2px] bg-[#E8F0FC] text-[#1D5FD1] font-semibold">
                {guide.category}
              </span>
              <span className="text-[#8C989F]">·</span>
              <span className="text-[#4E585E] flex items-center gap-1 tabular-nums">
                <Clock className="w-3.5 h-3.5" /> {guide.readTime}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold text-[#141517] tracking-tight leading-snug">
              {guide.title}
            </h1>

            <p className="text-base sm:text-lg text-[#4E585E] leading-relaxed font-normal">
              {guide.subtitle}
            </p>

            <div className="pt-4 flex items-center gap-3 text-xs text-[#4E585E] border-t border-[#DDE3E6]">
              <span className="font-semibold text-[#141517]">{guide.author}</span>
              <span className="text-[#8C989F]">·</span>
              <span>Published {guide.publishDate}</span>
            </div>
          </div>

          {/* Hero Image */}
          <div className="aspect-16/9 rounded-[2px] overflow-hidden bg-[#141517] border border-gray-800">
            <img src={guide.heroImage} alt="" className="w-full h-full object-cover" />
          </div>

          {/* Article Content Sections */}
          <div className="space-y-10 pt-2 border-t border-[#DDE3E6]">
            {guide.sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-bold text-[#141517] tracking-tight">
                  {section.heading}
                </h2>
                <p className="text-sm sm:text-base text-[#4E585E] leading-relaxed font-normal">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          {/* Article Footer Navigation */}
          <div className="pt-8 border-t border-[#DDE3E6] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => navigateTo('guides')}
              className="w-full sm:w-auto px-5 py-2.5 border border-[#C9D1D6] hover:border-[#141517] hover:bg-[#F7F8F8] text-[#2A2E31] rounded-[2px] text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              Back to all guides
            </button>
            <button
              onClick={() => navigateTo('marketplace')}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white rounded-[2px] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </article>
    </div>
  );
};
