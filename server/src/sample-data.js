export const sampleMovies = [
  { title: 'Iron Man', releaseYear: 2008, runtime: 126, prerequisites: [] },
  { title: 'Captain America: The First Avenger', releaseYear: 2011, runtime: 124, prerequisites: [] },
  { title: 'The Avengers', releaseYear: 2012, runtime: 143, prerequisites: ['Iron Man', 'Captain America: The First Avenger'] },
  { title: 'Captain America: Civil War', releaseYear: 2016, runtime: 147, prerequisites: ['The Avengers'] },
  { title: 'Thor: Ragnarok', releaseYear: 2017, runtime: 130, prerequisites: [] },
  { title: 'Avengers: Infinity War', releaseYear: 2018, runtime: 149, prerequisites: ['Captain America: Civil War', 'Thor: Ragnarok'] },
  { title: 'Avengers: Endgame', releaseYear: 2019, runtime: 181, prerequisites: ['Avengers: Infinity War'] },
  { title: 'Avengers: Doomsday', releaseYear: 2026, runtime: 180, prerequisites: ['Avengers: Endgame'] },
];
