
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
       <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and application settings.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
           <CardDescription>
            Choose what you want to be notified about.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center space-x-2">
            <Checkbox id="marketing-emails" />
            <Label htmlFor="marketing-emails">Receive marketing emails</Label>
          </div>
           <div className="flex items-center space-x-2">
            <Checkbox id="security-emails" defaultChecked />
            <Label htmlFor="security-emails">Receive security emails</Label>
          </div>
           <Button>Save Preferences</Button>
        </CardContent>
      </Card>
        <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
           <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Button variant="destructive">Delete My Account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
