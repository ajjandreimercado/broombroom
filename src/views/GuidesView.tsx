import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Clock, ArrowRight, BookOpen, Compass } from 'lucide-react';

export const GuidesView: React.FC = () => {
  const { guides, navigateTo } = useApp();

  return (
    <div className="min-h-screen bg-[#F7F8F8] pb-24">
      {/* Editorial Dark Header */}
      <section className="border-b border-[#141517]">
        <div className="gb-container pt-12 sm:pt-16 pb-12">
          <h1 className="font-display text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[0.95] text-[#141517] max-w-[16ch]">
            Guides, Inspections & Regulations
          </h1>
          <p className="mt-5 text-[16px] sm:text-[17px] text-[#4E585E] max-w-[56ch] leading-relaxed">
            Essential knowledge on LTO title transfers, pre-purchase mechanical checklists, vehicle valuation, and auto-loan financing in the Philippines.
          </p>
        </div>
      </section>

      {/* Guides Grid */}
      <div className="gb-container pt-10 sm:pt-12">
        <div className="flex items-center justify-between text-xs text-[#4E585E] mb-6 pb-2 border-b border-[#C9D1D6]">
          <span className="font-semibold text-[#141517]">
            Curated Articles <span className="text-[#6B767D] font-normal">({guides.length})</span>
          </span>
          <span className="text-[#6B767D] tabular-nums">Expert Editorial</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {guides.map((guide) => (
            <article
              key={guide.id}
              onClick={() => navigateTo('guide_detail', { guideSlug: guide.slug })}
              className="bg-white rounded-[2px] border border-[#C9D1D6] overflow-hidden hover:border-[#141517] transition-colors cursor-pointer flex flex-col justify-between group"
            >
              <div className="aspect-16/9 bg-[#141517] overflow-hidden relative">
                <img
                  src={guide.heroImage}
                  alt={guide.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-[2px] bg-[#141517]/80 text-gray-200 text-[11px] font-semibold border border-gray-800">
                    {guide.category}
                  </span>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#6B767D] font-medium mb-2 tabular-nums">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {guide.readTime}
                    </span>
                  </div>

                  <h2 className="font-display text-[22px] leading-tight text-[#141517] leading-snug group-hover:text-[#1D5FD1] transition-colors">
                    {guide.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4E585E] mt-2 leading-relaxed line-clamp-2">
                    {guide.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#DDE3E6] flex items-center justify-between text-xs">
                  <span className="text-[#4E585E] font-medium">{guide.author}</span>
                  <span className="text-[#1D5FD1] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Read Article</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
