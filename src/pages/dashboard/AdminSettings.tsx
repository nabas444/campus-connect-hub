import { useEffect, useState } from "react";
import { PlatformSettings, getSettings, saveSetting } from "@/lib/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Settings as SettingsIcon, Store, Bell } from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof PlatformSettings | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setSettings(await getSettings());
      } catch (err) {
        toast({ title: "Failed to load settings", description: String(err), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = <K extends keyof PlatformSettings>(key: K, patch: Partial<PlatformSettings[K]>) => {
    setSettings((s) => s ? { ...s, [key]: { ...s[key], ...patch } } : s);
  };

  const save = async (key: keyof PlatformSettings) => {
    if (!settings) return;
    setSaving(key);
    try {
      await saveSetting(key, settings[key]);
      toast({ title: "Settings saved" });
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  if (loading || !settings) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Platform-wide configuration for branding, marketplace and notifications.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><SettingsIcon className="h-5 w-5 text-accent" /> General</CardTitle>
          <CardDescription>Public branding and contact information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="platform_name">Platform name</Label>
              <Input id="platform_name" value={settings.general.platform_name} onChange={(e) => update("general", { platform_name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="support_email">Support email</Label>
              <Input id="support_email" type="email" value={settings.general.support_email} onChange={(e) => update("general", { support_email: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="default_currency">Default currency</Label>
              <Select value={settings.general.default_currency} onValueChange={(v) => update("general", { default_currency: v })}>
                <SelectTrigger id="default_currency" className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD — US Dollar</SelectItem>
                  <SelectItem value="eur">EUR — Euro</SelectItem>
                  <SelectItem value="gbp">GBP — British Pound</SelectItem>
                  <SelectItem value="cad">CAD — Canadian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => save("general")} disabled={saving === "general"}>
              {saving === "general" && <Loader2 className="h-4 w-4 animate-spin" />} Save general
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Store className="h-5 w-5 text-accent" /> Marketplace</CardTitle>
          <CardDescription>Rules for how projects and experts interact.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Allow expert signups"
            description="When off, only admins can create new expert accounts."
            checked={settings.marketplace.allow_expert_signup}
            onChange={(v) => update("marketplace", { allow_expert_signup: v })}
          />
          <ToggleRow
            label="Auto-assign new projects"
            description="Automatically suggest the best-rated available expert for each new project."
            checked={settings.marketplace.auto_assign}
            onChange={(v) => update("marketplace", { auto_assign: v })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="min_budget">Minimum project budget</Label>
              <Input id="min_budget" type="number" min={0} step="0.01" value={settings.marketplace.min_project_budget}
                onChange={(e) => update("marketplace", { min_project_budget: Number(e.target.value) })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="fee">Platform fee (%)</Label>
              <Input id="fee" type="number" min={0} max={100} step="0.5" value={settings.marketplace.platform_fee_percent}
                onChange={(e) => update("marketplace", { platform_fee_percent: Number(e.target.value) })} className="mt-1.5" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => save("marketplace")} disabled={saving === "marketplace"}>
              {saving === "marketplace" && <Loader2 className="h-4 w-4 animate-spin" />} Save marketplace
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Bell className="h-5 w-5 text-accent" /> Notifications</CardTitle>
          <CardDescription>Default email behaviour for users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Email on assignment"
            description="Notify experts when they are assigned a ticket or project."
            checked={settings.notifications.email_on_assignment}
            onChange={(v) => update("notifications", { email_on_assignment: v })}
          />
          <ToggleRow
            label="Email on new message"
            description="Send an email when a chat message arrives in a thread."
            checked={settings.notifications.email_on_message}
            onChange={(v) => update("notifications", { email_on_message: v })}
          />
          <div className="flex justify-end">
            <Button onClick={() => save("notifications")} disabled={saving === "notifications"}>
              {saving === "notifications" && <Loader2 className="h-4 w-4 animate-spin" />} Save notifications
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}