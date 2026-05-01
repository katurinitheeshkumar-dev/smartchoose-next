import { useState, useEffect, useCallback } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/utils';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>(() => safeGetItem('sc_job_bookmarks', []));

  useEffect(() => {
    safeSetItem('sc_job_bookmarks', bookmarks);
  }, [bookmarks]);

  const toggleBookmark = useCallback((jobId: string) => {
    setBookmarks(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId) 
        : [...prev, jobId]
    );
  }, []);

  const isBookmarked = useCallback((jobId: string) => {
    return bookmarks.includes(jobId);
  }, [bookmarks]);

  return { bookmarks, toggleBookmark, isBookmarked };
}
