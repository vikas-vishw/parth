// product: the Parth app's P0 placeholder. The nine areas - Today, Meetings, Council and
// Mentor, Research and Drafts, Connections, Rules, Ledger, Privacy and Device - arrive at P11
// with the design system. Six of them ship for the pilot (decision D2).
import { Text, View } from "react-native";

export const APP_TITLE = "Parth";
export const APP_NOTE = "P0 placeholder.";

export default function Index(): React.JSX.Element {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "600" }}>
        {APP_TITLE}
      </Text>
      <Text style={{ marginTop: 8 }}>{APP_NOTE}</Text>
    </View>
  );
}
