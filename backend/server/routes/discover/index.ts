import { TMDB } from 'tmdb-ts';
const tmdb = new TMDB(useRuntimeConfig().tmdbApiKey);

export default defineCachedEventHandler(
  async () => {
    const popular = { movies: [], shows: [] };
    popular.movies.push(
      ...(data => (data.results.sort((a, b) => b.vote_average - a.vote_average), data.results))(
        await tmdb.movies.popular()
      )
    );
    popular.shows.push(
      ...(data => (data.results.sort((a, b) => b.vote_average - a.vote_average), data.results))(
        await tmdb.tvShows.popular()
      )
    );

    const genres = {
      movies: await tmdb.genres.movies(),
      shows: await tmdb.genres.tvShows(),
    };
    const topRated = {
      movies: await tmdb.movies.topRated(),
      shows: await tmdb.tvShows.topRated(),
    };
    const nowPlaying = {
      movies: (await tmdb.movies.nowPlaying()).results.sort(
        (a, b) => b.vote_average - a.vote_average
      ),
      shows: (await tmdb.tvShows.onTheAir()).results.sort(
        (a, b) => b.vote_average - a.vote_average
      ),
    };

    return {
      popular,
      topRated,
      nowPlaying,
      genres,
    };
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 60 * 60 : 0,
  }
);
