import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { get } from "@/backend/metadata/tmdb";
import {
  EDITOR_PICKS_MOVIES,
  EDITOR_PICKS_TV_SHOWS,
  MOVIE_PROVIDERS,
  TV_PROVIDERS,
} from "@/pages/discover/types/discover";
import type {
  DiscoverContentType,
  DiscoverMedia,
  Genre,
  MediaType,
  Provider,
  UseDiscoverMediaProps,
  UseDiscoverMediaReturn,
} from "@/pages/discover/types/discover";
import { conf } from "@/setup/config";
import { useLanguageStore } from "@/stores/language";
import { getTmdbLanguageCode } from "@/utils/language";
import { detectUserLanguage, detectUserRegion } from "@/utils/userRegion";

// Re-export types for backward compatibility
export type {
  DiscoverContentType,
  DiscoverMedia,
  Genre,
  MediaType,
  Provider,
  UseDiscoverMediaProps,
  UseDiscoverMediaReturn,
};

// Re-export constants for backward compatibility
export {
  EDITOR_PICKS_MOVIES,
  EDITOR_PICKS_TV_SHOWS,
  MOVIE_PROVIDERS,
  TV_PROVIDERS,
};

export function useDiscoverOptions(mediaType: MediaType) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userLanguage = useLanguageStore((s) => s.language);
  const formattedLanguage = getTmdbLanguageCode(userLanguage);

  const providers = mediaType === "movie" ? MOVIE_PROVIDERS : TV_PROVIDERS;

  useEffect(() => {
    const fetchGenres = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await get<any>(`/genre/${mediaType}/list`, {
          api_key: conf().TMDB_READ_API_KEY,
          language: formattedLanguage,
        });
        setGenres(data.genres.slice(0, 50));
      } catch (err) {
        console.error(`Error fetching ${mediaType} genres:`, err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenres();
  }, [mediaType, formattedLanguage]);

  return {
    genres,
    providers,
    isLoading,
    error,
  };
}

export function useDiscoverMedia({
  contentType,
  mediaType,
  id,
  fallbackType,
  page = 1,
  genreName,
  providerName,
  mediaTitle,
  isCarouselView = false,
  enabled = true,
}: UseDiscoverMediaProps): UseDiscoverMediaReturn {
  const [media, setMedia] = useState<DiscoverMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [sectionTitle, setSectionTitle] = useState<string>("");
  const [currentContentType, setCurrentContentType] =
    useState<string>(contentType);
  const [currentId, setCurrentId] = useState<string | undefined>(id);
  const [currentMediaType, setCurrentMediaType] = useState<string | undefined>(mediaType);
  const [actualContentType, setActualContentType] =
    useState<DiscoverContentType>(contentType);

  const { t } = useTranslation();
  const userLanguage = useLanguageStore((s) => s.language);
  const formattedLanguage = getTmdbLanguageCode(userLanguage);

  // Reset media when content type, media type, or id changes
  if (contentType !== currentContentType || id !== currentId || mediaType !== currentMediaType) {
    setMedia([]);
    setCurrentContentType(contentType);
    setCurrentId(id);
    setCurrentMediaType(mediaType);
    setActualContentType(contentType); // Reset actual content type to original
  }

  const fetchTMDBMedia = useCallback(
    async (endpoint: string, params: Record<string, any> = {}) => {
      try {
        // For carousel views, we only need one page of results
        if (isCarouselView) {
          params.page = "1"; // Always use first page for carousels
        } else {
          params.page = page.toString(); // Use the requested page for "view more" pages
        }

        const region = detectUserRegion();

        const data = await get<any>(endpoint, {
          api_key: conf().TMDB_READ_API_KEY,
          language: formattedLanguage,
          region,
          ...params,
        });

        // For carousel views, we might want to limit the number of results
        const results = isCarouselView
          ? data.results.slice(0, 20)
          : data.results;

        return {
          results: results.map((item: any) => ({
            ...item,
            type: mediaType === "movie" ? "movie" : "show",
          })),
          hasMore: page < data.total_pages,
        };
      } catch (err) {
        console.error("Error fetching TMDB media:", err);
        throw err;
      }
    },
    [formattedLanguage, page, mediaType, isCarouselView],
  );

  const fetchEditorPicks = useCallback(async () => {
    const picks =
      mediaType === "movie" ? EDITOR_PICKS_MOVIES : EDITOR_PICKS_TV_SHOWS;

    // For carousel views, limit the number of picks to fetch
    const picksToFetch = isCarouselView ? picks.slice(0, 20) : picks;

    try {
      const mediaPromises = picksToFetch.map(async (item) => {
        const endpoint = `/${mediaType}/${item.id}`;
        const data = await get<any>(endpoint, {
          api_key: conf().TMDB_READ_API_KEY,
          language: formattedLanguage,
          append_to_response: "videos,images",
        });
        return {
          ...data,
          type: item.type,
        };
      });

      const results = await Promise.all(mediaPromises);
      return {
        results,
        hasMore: picks.length > picksToFetch.length,
      };
    } catch (err) {
      console.error("Error fetching editor picks:", err);
      throw err;
    }
  }, [mediaType, formattedLanguage, isCarouselView]);

  const fetchMedia = useCallback(async () => {
    // Skip fetching recommendations if no ID is provided
    if (contentType === "recommendations" && !id) {
      setIsLoading(false);
      setMedia([]);
      setHasMore(false);
      setSectionTitle("");
      return;
    }

    setIsLoading(true);
    setError(null);

    const attemptFetch = async (type: DiscoverContentType) => {
      let data;

      switch (type) {
        case "popular":
          data = await fetchTMDBMedia(`/discover/${mediaType}`, {
            sort_by: "popularity.desc",
            with_original_language: detectUserLanguage(),
            "vote_count.gte": 50,
          });
          setSectionTitle(t("discover.carousel.title.popular"));
          break;

        case "topRated":
          data = await fetchTMDBMedia(`/discover/${mediaType}`, {
            sort_by: "vote_average.desc",
            with_original_language: detectUserLanguage(),
            "vote_count.gte": 500,
          });
          setSectionTitle(t("discover.carousel.title.topRated"));
          break;

        case "onTheAir":
          if (mediaType === "tv") {
            data = await fetchTMDBMedia("/tv/on_the_air");
            setSectionTitle(t("discover.carousel.title.onTheAir"));
          } else {
            throw new Error("onTheAir is only available for TV shows");
          }
          break;

        case "nowPlaying":
          if (mediaType === "movie") {
            data = await fetchTMDBMedia("/movie/now_playing");
            setSectionTitle(t("discover.carousel.title.inCinemas"));
          } else {
            throw new Error("nowPlaying is only available for movies");
          }
          break;

        case "top10":
          data = await fetchTMDBMedia(`/discover/${mediaType}`, {
            sort_by: "popularity.desc",
            with_original_language: detectUserLanguage(),
            "vote_count.gte": 200,
          });
          setSectionTitle(t("discover.carousel.title.top10"));
          break;

        case "latest":
          if (mediaType === "movie") {
            data = await fetchTMDBMedia("/movie/now_playing");
          } else {
            data = await fetchTMDBMedia("/tv/on_the_air");
          }
          setSectionTitle(t("discover.carousel.title.latestReleases"));
          break;

        case "latest4k":
          data = await fetchTMDBMedia(`/discover/${mediaType}`, {
            sort_by: "vote_average.desc",
            with_original_language: detectUserLanguage(),
            "vote_count.gte": 100,
          });
          setSectionTitle(t("discover.carousel.title.4kReleases"));
          break;

        case "latesttv":
          data = await fetchTMDBMedia("/tv/on_the_air");
          setSectionTitle(t("discover.carousel.title.latestTVReleases"));
          break;

        case "genre":
          if (!id) throw new Error("Genre ID is required");

          // Use TMDB for genres (Trakt genre endpoints removed)
          data = await fetchTMDBMedia(`/discover/${mediaType}`, {
            with_genres: id,
          });
          setSectionTitle(
            mediaType === "movie"
              ? t("discover.carousel.title.movies", { category: genreName })
              : t("discover.carousel.title.tvshows", { category: genreName }),
          );
          break;

        case "provider":
          if (!id) throw new Error("Provider ID is required");

          data = await fetchTMDBMedia(`/discover/${mediaType}`, {
            with_watch_providers: id,
            watch_region: detectUserRegion(),
          });
          setSectionTitle(
            mediaType === "movie"
              ? t("discover.carousel.title.moviesOn", {
                  provider: providerName,
                })
              : t("discover.carousel.title.tvshowsOn", {
                  provider: providerName,
                }),
          );
          break;

        case "recommendations":
          if (!id) throw new Error("Media ID is required for recommendations");
          data = await fetchTMDBMedia(`/${mediaType}/${id}/recommendations`);
          setSectionTitle(
            t("discover.carousel.title.recommended", { title: mediaTitle }),
          );
          break;

        case "editorPicks":
          data = await fetchEditorPicks();
          setSectionTitle(
            mediaType === "movie"
              ? t("discover.carousel.title.editorPicksMovies")
              : t("discover.carousel.title.editorPicksShows"),
          );
          break;

        default:
          throw new Error(`Unsupported content type: ${type}`);
      }

      return data;
    };

    try {
      const data = await attemptFetch(contentType);
      setMedia((prevMedia) => {
        const valid = data.results.filter(
          (item: DiscoverMedia) => item.id != null,
        );
        return page === 1 ? valid : [...prevMedia, ...valid];
      });
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Error fetching media:", err);
      setError((err as Error).message);

      // Try fallback content type if available
      if (fallbackType && fallbackType !== contentType) {
        console.info(`Falling back from ${contentType} to ${fallbackType}`);
        try {
          const fallbackData = await attemptFetch(fallbackType);
          setActualContentType(fallbackType); // Set actual content type to fallback
          setMedia((prevMedia) => {
            const valid = fallbackData.results.filter(
              (item: DiscoverMedia) => item.id != null,
            );
            return page === 1 ? valid : [...prevMedia, ...valid];
          });
          setHasMore(fallbackData.hasMore);
          setError(null); // Clear error if fallback succeeds
        } catch (fallbackErr) {
          console.error("Error fetching fallback media:", fallbackErr);
          setError((fallbackErr as Error).message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    contentType,
    mediaType,
    id,
    fallbackType,
    genreName,
    providerName,
    mediaTitle,
    fetchTMDBMedia,
    fetchEditorPicks,
    t,
    page,
  ]);

  useEffect(() => {
    // Reset media when content type, media type, or id changes
    if (contentType !== currentContentType || page === 1) {
      setMedia([]);
      setCurrentContentType(contentType);
    }
    // Only fetch when enabled
    if (enabled) {
      fetchMedia();
    }
  }, [fetchMedia, contentType, currentContentType, page, id, enabled]);

  return {
    media,
    isLoading,
    error,
    hasMore,
    refetch: fetchMedia,
    sectionTitle,
    actualContentType,
  };
}
