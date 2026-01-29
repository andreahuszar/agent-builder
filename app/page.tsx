import MainApp from './components/MainApp';

export default function Home() {
  try {
    return <MainApp />;
  } catch (error) {
    throw error;
  }
}