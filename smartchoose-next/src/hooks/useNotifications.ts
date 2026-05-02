import { useState, useEffect, useCallback } from 'react';
import { messaging, db } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';
import { doc, setDoc, getDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

export type NotificationTopic = 'jobs' | 'products' | 'blog';

export function useNotifications(topic: NotificationTopic) {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`sc_notify_dismissed_${topic}`) === 'true';
    }
    return false;
  });
  const [loading, setLoading] = useState(false);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`sc_notify_dismissed_${topic}`, 'true');
    }
  }, [topic]);

  const checkSubscription = useCallback(async () => {
    if (!messaging || !('Notification' in window)) return;
    
    if (Notification.permission !== 'granted') {
      setIsSubscribed(false);
      return;
    }

    try {
      const token = await getToken(messaging, { 
        vapidKey: 'BGSQPDQp1dp2nlt4hXSC2ngOfPBGbzRYkHTklNF7g6udN1qJQfhyTBjyvweOKUuBF9n1l3SvRJmWaZpXTvCWRMo'
      });
      
      if (token) {
        const docRef = doc(db, 'subscriptions', token);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsSubscribed(data.topics?.includes(topic) || false);
        } else {
          setIsSubscribed(false);
        }
      }
    } catch (err) {
      console.warn('Subscription check failed:', err);
      setIsSubscribed(false);
    }
  }, [topic]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = async () => {
    if (!messaging) return false;
    setLoading(true);
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { 
          vapidKey: 'BGSQPDQp1dp2nlt4hXSC2ngOfPBGbzRYkHTklNF7g6udN1qJQfhyTBjyvweOKUuBF9n1l3SvRJmWaZpXTvCWRMo'
        });
        
        if (token) {
          const docRef = doc(db, 'subscriptions', token);
          await setDoc(docRef, {
            token,
            topics: arrayUnion(topic),
            updatedAt: serverTimestamp(),
            platform: 'web'
          }, { merge: true });
          
          setIsSubscribed(true);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Subscription error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { isSubscribed, subscribe, loading, isDismissed, dismiss };
}
