import { Redirect } from "expo-router";

export default function Index() {
  // This will redirect to the image-picker screen
  return <Redirect href="/image-picker" />;
}
