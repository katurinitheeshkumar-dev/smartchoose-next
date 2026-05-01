import { useMemo } from 'react';
import { PlatformIcon } from '@/components/ui/custom/PlatformIcon';
import { detectEcommercePlatform } from '@/lib/utils';

export function PlatformBadge({ url, name }: { url?: string; name?: string }) {
  const platformName = useMemo(() => {
    if (name) return name;
    if (url) return detectEcommercePlatform(url).name;
    return 'Store';
  }, [url, name]);

  return <PlatformIcon name={platformName} size="sm" showText className="scale-90 origin-left" />;
}
