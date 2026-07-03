import { t } from "i18next";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

import { WideContainer } from "@/components/layout/WideContainer";
import { SubPageLayout } from "@/pages/layouts/SubPageLayout";
import { useDiscoverStore } from "@/stores/discover";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { MediaItem } from "@/utils/mediaTypes";

import { LazyMediaCarousel } from "./components/LazyMediaCarousel";

export function DiscoverMore() {
  const { showModal } = useOverlayStack();
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const navigate = useNavigate();
  const { lastView } = useDiscoverStore();

  const handleShowDetails = async (media: MediaItem) => {
    showModal("discover-details", {
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
  };

  const handleBack = () => {
    if (lastView) {
      navigate(lastView.url);
      window.scrollTo(0, lastView.scrollPosition);
    } else {
      navigate(-1);
    }
  };

  return (
    <SubPageLayout>
      <WideContainer>
        <div className="flex items-center justify-between gap-8">
          <h1 className="text-2xl font-bold text-white">
            {t("discover.allLists")}
          </h1>
        </div>
        <div className="flex items-center gap-4 pb-8">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center text-white hover:text-gray-300 transition-colors"
          >
            <span className="ml-2">{t("discover.page.back")}</span>
          </button>
        </div>
      </WideContainer>
      <WideContainer ultraWide>
        <LazyMediaCarousel
          content={{ type: "nowPlaying" }}
          isTVShow={false}
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          priority
        />
        <LazyMediaCarousel
          content={{ type: "topRated" }}
          isTVShow={false}
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          priority
        />
        <LazyMediaCarousel
          content={{ type: "editorPicks" }}
          isTVShow={false}
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
        />
      </WideContainer>
    </SubPageLayout>
  );
}
