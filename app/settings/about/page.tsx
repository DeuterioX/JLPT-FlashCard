import { AboutScreen } from '@/components/settings/AboutScreen';
import pkg from '@/package.json';

export default function Page() {
  return <AboutScreen version={pkg.version} buildDate={process.env.BUILD_DATE} />;
}
