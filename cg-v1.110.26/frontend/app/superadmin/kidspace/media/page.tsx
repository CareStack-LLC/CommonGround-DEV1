'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Film, BookOpen, Users2, Tag, Plus, Loader2, Trash2, Edit3,
  X, RefreshCw, CheckCircle, AlertTriangle, Star, Upload,
  Eye, EyeOff, Trophy, Clock, BookOpenCheck,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Tab = 'movies' | 'books' | 'authors' | 'genres';

interface Movie {
  id: string;
  title: string;
  description: string;
  duration: number;
  age_range_min: number;
  age_range_max: number;
  genre_id: string;
  genre_name?: string;
  trailer_url: string;
  video_url: string;
  poster_url: string;
  is_featured: boolean;
  is_visible: boolean;
  view_count: number;
  total_minutes_watched: number;
  created_at: string;
}

interface Book {
  id: string;
  title: string;
  description: string;
  author_id: string;
  author_name?: string;
  page_count: number;
  age_range_min: number;
  age_range_max: number;
  genre_id: string;
  genre_name?: string;
  pdf_url: string;
  cover_url: string;
  is_featured: boolean;
  is_visible: boolean;
  read_count: number;
  total_pages_turned: number;
  created_at: string;
}

interface Author {
  id: string;
  name: string;
  bio: string;
  photo_url: string;
  showcase_book_id: string;
  is_featured: boolean;
  created_at: string;
}

interface Genre {
  id: string;
  name: string;
  emoji: string;
  description: string;
  movie_count: number;
  book_count: number;
  created_at: string;
}

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'movies', label: 'Movies', icon: Film },
  { key: 'books', label: 'Books', icon: BookOpen },
  { key: 'authors', label: 'Authors', icon: Users2 },
  { key: 'genres', label: 'Genres', icon: Tag },
];

export default function MediaLibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('movies');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Data
  const [movies, setMovies] = useState<Movie[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);

  // Modals
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [saving, setSaving] = useState(false);

  // Inline genre editing
  const [newGenreName, setNewGenreName] = useState('');
  const [newGenreEmoji, setNewGenreEmoji] = useState('');
  const [newGenreDesc, setNewGenreDesc] = useState('');
  const [addingGenre, setAddingGenre] = useState(false);

  // Movie form
  const [movieTitle, setMovieTitle] = useState('');
  const [movieDesc, setMovieDesc] = useState('');
  const [movieDuration, setMovieDuration] = useState('');
  const [movieAgeMin, setMovieAgeMin] = useState('3');
  const [movieAgeMax, setMovieAgeMax] = useState('12');
  const [movieGenreId, setMovieGenreId] = useState('');
  const [movieTrailerUrl, setMovieTrailerUrl] = useState('');
  const [movieFeatured, setMovieFeatured] = useState(false);
  const [movieVisible, setMovieVisible] = useState(true);
  const [movieVideoFile, setMovieVideoFile] = useState<File | null>(null);
  const [moviePosterFile, setMoviePosterFile] = useState<File | null>(null);

  // Book form
  const [bookTitle, setBookTitle] = useState('');
  const [bookDesc, setBookDesc] = useState('');
  const [bookAuthorId, setBookAuthorId] = useState('');
  const [bookPageCount, setBookPageCount] = useState('');
  const [bookAgeMin, setBookAgeMin] = useState('3');
  const [bookAgeMax, setBookAgeMax] = useState('12');
  const [bookGenreId, setBookGenreId] = useState('');
  const [bookFeatured, setBookFeatured] = useState(false);
  const [bookVisible, setBookVisible] = useState(true);
  const [bookPdfFile, setBookPdfFile] = useState<File | null>(null);
  const [bookCoverFile, setBookCoverFile] = useState<File | null>(null);

  // Author form
  const [authorName, setAuthorName] = useState('');
  const [authorBio, setAuthorBio] = useState('');
  const [authorShowcaseBookId, setAuthorShowcaseBookId] = useState('');
  const [authorFeatured, setAuthorFeatured] = useState(false);
  const [authorPhotoFile, setAuthorPhotoFile] = useState<File | null>(null);

  const getToken = () => localStorage.getItem('access_token') || '';

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const headers = { Authorization: `Bearer ${getToken()}` };

      const [moviesRes, booksRes, authorsRes, genresRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/kidspace/admin/movies`, { headers }),
        fetch(`${API_BASE}/api/v1/kidspace/admin/books`, { headers }),
        fetch(`${API_BASE}/api/v1/kidspace/admin/authors`, { headers }),
        fetch(`${API_BASE}/api/v1/kidspace/admin/genres`, { headers }),
      ]);

      if (moviesRes.ok) { const d = await moviesRes.json(); setMovies(Array.isArray(d) ? d : d.movies || []); }
      if (booksRes.ok) { const d = await booksRes.json(); setBooks(Array.isArray(d) ? d : d.books || []); }
      if (authorsRes.ok) { const d = await authorsRes.json(); setAuthors(Array.isArray(d) ? d : d.authors || []); }
      if (genresRes.ok) { const d = await genresRes.json(); setGenres(Array.isArray(d) ? d : d.genres || []); }
    } catch (err) {
      console.error('Failed to load media data:', err);
      setError('Failed to load media data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Movie handlers ----
  const resetMovieForm = () => {
    setMovieTitle(''); setMovieDesc(''); setMovieDuration(''); setMovieAgeMin('3'); setMovieAgeMax('12');
    setMovieGenreId(''); setMovieTrailerUrl(''); setMovieFeatured(false); setMovieVisible(true);
    setMovieVideoFile(null); setMoviePosterFile(null); setEditingMovie(null);
  };

  const openMovieCreate = () => { resetMovieForm(); setShowMovieModal(true); };

  const openMovieEdit = (m: Movie) => {
    setEditingMovie(m); setMovieTitle(m.title); setMovieDesc(m.description || '');
    setMovieDuration(String(m.duration || '')); setMovieAgeMin(String(m.age_range_min || 3));
    setMovieAgeMax(String(m.age_range_max || 12)); setMovieGenreId(m.genre_id || '');
    setMovieTrailerUrl(m.trailer_url || ''); setMovieFeatured(m.is_featured);
    setMovieVisible(m.is_visible); setMovieVideoFile(null); setMoviePosterFile(null);
    setShowMovieModal(true);
  };

  const handleSaveMovie = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('title', movieTitle);
      formData.append('description', movieDesc);
      formData.append('duration_minutes', movieDuration);
      formData.append('age_min', movieAgeMin);
      formData.append('age_max', movieAgeMax);
      if (movieGenreId) formData.append('genre_id', movieGenreId);
      formData.append('trailer_url', movieTrailerUrl);
      formData.append('is_featured', String(movieFeatured));
      formData.append('is_visible', String(movieVisible));
      if (movieVideoFile) formData.append('video', movieVideoFile);
      if (moviePosterFile) formData.append('poster', moviePosterFile);

      const url = editingMovie
        ? `${API_BASE}/api/v1/kidspace/admin/movies/${editingMovie.id}`
        : `${API_BASE}/api/v1/kidspace/admin/movies`;

      const res = await fetch(url, {
        method: editingMovie ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to save movie');
      setShowMovieModal(false); resetMovieForm();
      showSuccess(editingMovie ? 'Movie updated' : 'Movie added');
      await fetchData();
    } catch (err) {
      console.error('Save movie failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMovie = async (id: string) => {
    if (!confirm('Delete this movie?')) return;
    try {
      await fetch(`${API_BASE}/api/v1/kidspace/admin/movies/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      showSuccess('Movie deleted');
      await fetchData();
    } catch (err) { console.error('Delete movie failed:', err); }
  };

  // ---- Book handlers ----
  const resetBookForm = () => {
    setBookTitle(''); setBookDesc(''); setBookAuthorId(''); setBookPageCount('');
    setBookAgeMin('3'); setBookAgeMax('12'); setBookGenreId('');
    setBookFeatured(false); setBookVisible(true);
    setBookPdfFile(null); setBookCoverFile(null); setEditingBook(null);
  };

  const openBookCreate = () => { resetBookForm(); setShowBookModal(true); };

  const openBookEdit = (b: Book) => {
    setEditingBook(b); setBookTitle(b.title); setBookDesc(b.description || '');
    setBookAuthorId(b.author_id || ''); setBookPageCount(String(b.page_count || ''));
    setBookAgeMin(String(b.age_range_min || 3)); setBookAgeMax(String(b.age_range_max || 12));
    setBookGenreId(b.genre_id || ''); setBookFeatured(b.is_featured); setBookVisible(b.is_visible);
    setBookPdfFile(null); setBookCoverFile(null); setShowBookModal(true);
  };

  const handleSaveBook = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('title', bookTitle);
      formData.append('description', bookDesc);
      if (bookAuthorId) formData.append('author_id', bookAuthorId);
      formData.append('page_count', bookPageCount);
      formData.append('age_min', bookAgeMin);
      formData.append('age_max', bookAgeMax);
      if (bookGenreId) formData.append('genre_id', bookGenreId);
      formData.append('is_featured', String(bookFeatured));
      formData.append('is_visible', String(bookVisible));
      if (bookPdfFile) formData.append('pdf', bookPdfFile);
      if (bookCoverFile) formData.append('cover', bookCoverFile);

      const url = editingBook
        ? `${API_BASE}/api/v1/kidspace/admin/books/${editingBook.id}`
        : `${API_BASE}/api/v1/kidspace/admin/books`;

      const res = await fetch(url, {
        method: editingBook ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to save book');
      setShowBookModal(false); resetBookForm();
      showSuccess(editingBook ? 'Book updated' : 'Book added');
      await fetchData();
    } catch (err) {
      console.error('Save book failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Delete this book?')) return;
    try {
      await fetch(`${API_BASE}/api/v1/kidspace/admin/books/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      showSuccess('Book deleted');
      await fetchData();
    } catch (err) { console.error('Delete book failed:', err); }
  };

  // ---- Author handlers ----
  const resetAuthorForm = () => {
    setAuthorName(''); setAuthorBio(''); setAuthorShowcaseBookId('');
    setAuthorFeatured(false); setAuthorPhotoFile(null); setEditingAuthor(null);
  };

  const openAuthorCreate = () => { resetAuthorForm(); setShowAuthorModal(true); };

  const openAuthorEdit = (a: Author) => {
    setEditingAuthor(a); setAuthorName(a.name); setAuthorBio(a.bio || '');
    setAuthorShowcaseBookId(a.showcase_book_id || ''); setAuthorFeatured(a.is_featured);
    setAuthorPhotoFile(null); setShowAuthorModal(true);
  };

  const handleSaveAuthor = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('name', authorName);
      formData.append('bio', authorBio);
      if (authorShowcaseBookId) formData.append('showcase_book_id', authorShowcaseBookId);
      formData.append('is_featured', String(authorFeatured));
      if (authorPhotoFile) formData.append('photo', authorPhotoFile);

      const url = editingAuthor
        ? `${API_BASE}/api/v1/kidspace/admin/authors/${editingAuthor.id}`
        : `${API_BASE}/api/v1/kidspace/admin/authors`;

      const res = await fetch(url, {
        method: editingAuthor ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to save author');
      setShowAuthorModal(false); resetAuthorForm();
      showSuccess(editingAuthor ? 'Author updated' : 'Author added');
      await fetchData();
    } catch (err) {
      console.error('Save author failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAuthor = async (id: string) => {
    if (!confirm('Delete this author?')) return;
    try {
      await fetch(`${API_BASE}/api/v1/kidspace/admin/authors/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      showSuccess('Author deleted');
      await fetchData();
    } catch (err) { console.error('Delete author failed:', err); }
  };

  // ---- Genre handlers ----
  const handleAddGenre = async () => {
    if (!newGenreName.trim()) return;
    try {
      setAddingGenre(true);
      const res = await fetch(`${API_BASE}/api/v1/kidspace/admin/genres`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: newGenreName, emoji: newGenreEmoji || '🎬', description: newGenreDesc }),
      });
      if (!res.ok) throw new Error('Failed to add genre');
      setNewGenreName(''); setNewGenreEmoji(''); setNewGenreDesc('');
      showSuccess('Genre added');
      await fetchData();
    } catch (err) {
      console.error('Add genre failed:', err);
    } finally {
      setAddingGenre(false);
    }
  };

  const handleDeleteGenre = async (id: string) => {
    if (!confirm('Delete this genre?')) return;
    try {
      await fetch(`${API_BASE}/api/v1/kidspace/admin/genres/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      showSuccess('Genre deleted');
      await fetchData();
    } catch (err) { console.error('Delete genre failed:', err); }
  };

  // Find top items for badges
  const topMovie = movies.length > 0 ? movies.reduce((max, m) => m.view_count > max.view_count ? m : max, movies[0]) : null;
  const topBook = books.length > 0 ? books.reduce((max, b) => b.read_count > max.read_count ? b : max, books[0]) : null;

  const inputCls = "w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50";
  const labelCls = "text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1.5";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Media Library</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage KidSpace movies, books, authors & genres</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-sm text-emerald-300">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-violet-500/15 text-violet-300 shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-zinc-800/60 rounded-lg h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* ============ MOVIES TAB ============ */}
          {activeTab === 'movies' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={openMovieCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" /> Add Movie
                </button>
              </div>

              {movies.length === 0 ? (
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl py-16 text-center">
                  <Film className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No movies yet</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {movies.map(movie => (
                    <div key={movie.id} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden group">
                      <div className="relative aspect-[2/3] bg-zinc-800/40">
                        {movie.poster_url ? (
                          <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-10 h-10 text-zinc-700" />
                          </div>
                        )}
                        {topMovie && topMovie.id === movie.id && topMovie.view_count > 0 && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/90 text-[11px] font-bold text-black">
                            <Trophy className="w-3 h-3" /> Most Played
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openMovieEdit(movie)} className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteMovie(movie.id)} className="p-1.5 rounded-lg bg-black/60 text-red-400 hover:bg-black/80 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5">
                        <h3 className="text-sm font-medium text-zinc-200 line-clamp-1">{movie.title}</h3>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{movie.duration}m</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{movie.view_count}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                          <span>{movie.total_minutes_watched} min watched</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ BOOKS TAB ============ */}
          {activeTab === 'books' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={openBookCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" /> Add Book
                </button>
              </div>

              {books.length === 0 ? (
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl py-16 text-center">
                  <BookOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No books yet</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {books.map(book => (
                    <div key={book.id} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden group">
                      <div className="relative aspect-[2/3] bg-zinc-800/40">
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-10 h-10 text-zinc-700" />
                          </div>
                        )}
                        {topBook && topBook.id === book.id && topBook.read_count > 0 && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/90 text-[11px] font-bold text-black">
                            <Trophy className="w-3 h-3" /> Most Read
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openBookEdit(book)} className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteBook(book.id)} className="p-1.5 rounded-lg bg-black/60 text-red-400 hover:bg-black/80 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5">
                        <h3 className="text-sm font-medium text-zinc-200 line-clamp-1">{book.title}</h3>
                        <p className="text-[11px] text-zinc-500">{book.author_name || 'Unknown author'}</p>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                          <span className="flex items-center gap-1"><BookOpenCheck className="w-3 h-3" />{book.read_count} reads</span>
                          <span>{book.total_pages_turned} pages</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ AUTHORS TAB ============ */}
          {activeTab === 'authors' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={openAuthorCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" /> Add Author
                </button>
              </div>

              {authors.length === 0 ? (
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl py-16 text-center">
                  <Users2 className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No authors yet</p>
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl divide-y divide-zinc-800/40">
                  {authors.map(author => (
                    <div key={author.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/20 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-zinc-800/60 flex-shrink-0 overflow-hidden">
                        {author.photo_url ? (
                          <img src={author.photo_url} alt={author.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-lg font-bold">
                            {author.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200">{author.name}</span>
                          {author.is_featured && (
                            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">
                              <Star className="w-3 h-3" /> Featured
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{author.bio || 'No bio'}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openAuthorEdit(author)} className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteAuthor(author.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ GENRES TAB ============ */}
          {activeTab === 'genres' && (
            <div className="space-y-4">
              {/* Inline add */}
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={newGenreEmoji} onChange={e => setNewGenreEmoji(e.target.value)} placeholder="Emoji" className={`${inputCls} w-20`} />
                  <input value={newGenreName} onChange={e => setNewGenreName(e.target.value)} placeholder="Genre name" className={`${inputCls} flex-1`} />
                  <input value={newGenreDesc} onChange={e => setNewGenreDesc(e.target.value)} placeholder="Description" className={`${inputCls} flex-1`} />
                  <button
                    onClick={handleAddGenre}
                    disabled={addingGenre || !newGenreName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {addingGenre ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Genre
                  </button>
                </div>
              </div>

              {genres.length === 0 ? (
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl py-16 text-center">
                  <Tag className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No genres yet</p>
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl divide-y divide-zinc-800/40">
                  {genres.map(genre => (
                    <div key={genre.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/20 transition-colors">
                      <span className="text-2xl">{genre.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-zinc-200">{genre.name}</span>
                        <p className="text-xs text-zinc-500 mt-0.5">{genre.description || 'No description'}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 flex-shrink-0">
                        <span>{genre.movie_count} movies</span>
                        <span>{genre.book_count} books</span>
                      </div>
                      <button onClick={() => handleDeleteGenre(genre.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============ MOVIE MODAL ============ */}
      {showMovieModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => { setShowMovieModal(false); resetMovieForm(); }} />
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800/60 rounded-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{editingMovie ? 'Edit Movie' : 'Add Movie'}</h2>
              <button onClick={() => { setShowMovieModal(false); resetMovieForm(); }} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div><label className={labelCls}>Title</label><input value={movieTitle} onChange={e => setMovieTitle(e.target.value)} placeholder="Movie title" className={inputCls} /></div>
              <div><label className={labelCls}>Description</label><textarea value={movieDesc} onChange={e => setMovieDesc(e.target.value)} placeholder="Movie description" rows={3} className={`${inputCls} resize-y`} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={labelCls}>Duration (min)</label><input type="number" value={movieDuration} onChange={e => setMovieDuration(e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Age Min</label><input type="number" value={movieAgeMin} onChange={e => setMovieAgeMin(e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Age Max</label><input type="number" value={movieAgeMax} onChange={e => setMovieAgeMax(e.target.value)} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Genre</label>
                  <select value={movieGenreId} onChange={e => setMovieGenreId(e.target.value)} className={inputCls}>
                    <option value="">Select genre...</option>
                    {genres.map(g => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Trailer URL</label><input value={movieTrailerUrl} onChange={e => setMovieTrailerUrl(e.target.value)} placeholder="https://..." className={inputCls} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Video File (.mp4)</label>
                  <label className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 rounded-lg cursor-pointer hover:border-zinc-600/60 transition-colors">
                    <Upload className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400 truncate">{movieVideoFile ? movieVideoFile.name : 'Choose video...'}</span>
                    <input type="file" accept="video/mp4" className="hidden" onChange={e => setMovieVideoFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <label className={labelCls}>Poster Image</label>
                  <label className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 rounded-lg cursor-pointer hover:border-zinc-600/60 transition-colors">
                    <Upload className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400 truncate">{moviePosterFile ? moviePosterFile.name : 'Choose image...'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => setMoviePosterFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={movieFeatured} onChange={e => setMovieFeatured(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500/30" />
                  <span className="text-sm text-zinc-300">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={movieVisible} onChange={e => setMovieVisible(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500/30" />
                  <span className="text-sm text-zinc-300">Visible</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/60">
              <button onClick={() => { setShowMovieModal(false); resetMovieForm(); }} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors">Cancel</button>
              <button onClick={handleSaveMovie} disabled={saving || !movieTitle.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editingMovie ? 'Update Movie' : 'Add Movie'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ BOOK MODAL ============ */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => { setShowBookModal(false); resetBookForm(); }} />
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800/60 rounded-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{editingBook ? 'Edit Book' : 'Add Book'}</h2>
              <button onClick={() => { setShowBookModal(false); resetBookForm(); }} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div><label className={labelCls}>Title</label><input value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="Book title" className={inputCls} /></div>
              <div>
                <label className={labelCls}>Author</label>
                <select value={bookAuthorId} onChange={e => setBookAuthorId(e.target.value)} className={inputCls}>
                  <option value="">Select author...</option>
                  {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Description</label><textarea value={bookDesc} onChange={e => setBookDesc(e.target.value)} placeholder="Book description" rows={3} className={`${inputCls} resize-y`} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={labelCls}>Page Count</label><input type="number" value={bookPageCount} onChange={e => setBookPageCount(e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Age Min</label><input type="number" value={bookAgeMin} onChange={e => setBookAgeMin(e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Age Max</label><input type="number" value={bookAgeMax} onChange={e => setBookAgeMax(e.target.value)} className={inputCls} /></div>
              </div>
              <div>
                <label className={labelCls}>Genre</label>
                <select value={bookGenreId} onChange={e => setBookGenreId(e.target.value)} className={inputCls}>
                  <option value="">Select genre...</option>
                  {genres.map(g => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>PDF File</label>
                  <label className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 rounded-lg cursor-pointer hover:border-zinc-600/60 transition-colors">
                    <Upload className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400 truncate">{bookPdfFile ? bookPdfFile.name : 'Choose PDF...'}</span>
                    <input type="file" accept=".pdf" className="hidden" onChange={e => setBookPdfFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <label className={labelCls}>Cover Image</label>
                  <label className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 rounded-lg cursor-pointer hover:border-zinc-600/60 transition-colors">
                    <Upload className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400 truncate">{bookCoverFile ? bookCoverFile.name : 'Choose image...'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => setBookCoverFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={bookFeatured} onChange={e => setBookFeatured(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500/30" />
                  <span className="text-sm text-zinc-300">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={bookVisible} onChange={e => setBookVisible(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500/30" />
                  <span className="text-sm text-zinc-300">Visible</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/60">
              <button onClick={() => { setShowBookModal(false); resetBookForm(); }} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors">Cancel</button>
              <button onClick={handleSaveBook} disabled={saving || !bookTitle.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editingBook ? 'Update Book' : 'Add Book'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ AUTHOR MODAL ============ */}
      {showAuthorModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => { setShowAuthorModal(false); resetAuthorForm(); }} />
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800/60 rounded-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{editingAuthor ? 'Edit Author' : 'Add Author'}</h2>
              <button onClick={() => { setShowAuthorModal(false); resetAuthorForm(); }} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div><label className={labelCls}>Name</label><input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Author name" className={inputCls} /></div>
              <div><label className={labelCls}>Bio</label><textarea value={authorBio} onChange={e => setAuthorBio(e.target.value)} placeholder="Author bio..." rows={4} className={`${inputCls} resize-y`} /></div>
              <div>
                <label className={labelCls}>Photo</label>
                <label className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 rounded-lg cursor-pointer hover:border-zinc-600/60 transition-colors">
                  <Upload className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm text-zinc-400 truncate">{authorPhotoFile ? authorPhotoFile.name : 'Choose photo...'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setAuthorPhotoFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div>
                <label className={labelCls}>Showcase Book</label>
                <select value={authorShowcaseBookId} onChange={e => setAuthorShowcaseBookId(e.target.value)} className={inputCls}>
                  <option value="">Select book...</option>
                  {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={authorFeatured} onChange={e => setAuthorFeatured(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500/30" />
                <span className="text-sm text-zinc-300">Featured Author</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/60">
              <button onClick={() => { setShowAuthorModal(false); resetAuthorForm(); }} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors">Cancel</button>
              <button onClick={handleSaveAuthor} disabled={saving || !authorName.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editingAuthor ? 'Update Author' : 'Add Author'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
