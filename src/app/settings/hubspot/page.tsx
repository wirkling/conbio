'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Link2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function HubSpotSettingsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error('Please enter an API key');
      return;
    }

    setIsTestingConnection(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // For now, always show "coming soon" message
    toast.info('HubSpot integration coming soon! Connection test will be available once implemented.');
    setIsTestingConnection(false);
  };

  const handleSave = async () => {
    toast.info('HubSpot integration coming soon! Settings will be saved once implemented.');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">HubSpot Integration</h1>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              Coming Soon
            </Badge>
          </div>
          <p className="text-gray-500">
            Connect your HubSpot account to sync deals
          </p>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="flex items-start gap-4 pt-6">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800">Integration Not Yet Active</h3>
            <p className="text-sm text-yellow-700 mt-1">
              The HubSpot integration is currently being developed. You can configure your settings below,
              and they will be activated once the integration is complete. Contact your administrator for updates.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700">Connected</p>
                    <p className="text-sm text-gray-500">Last synced: Never</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">Not Connected</p>
                    <p className="text-sm text-gray-500">Enter your API key to connect</p>
                  </div>
                </>
              )}
            </div>
            {isConnected && (
              <Button variant="outline" size="sm" disabled>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Enter your HubSpot API credentials to enable the integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="api-key">API Key (Private App Token)</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled
              />
              <p className="text-xs text-gray-500">
                Create a private app in HubSpot to get your API token.{' '}
                <a
                  href="https://developers.hubspot.com/docs/api/private-apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Learn more <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="portal-id">Portal ID (optional)</Label>
              <Input
                id="portal-id"
                placeholder="e.g., 12345678"
                disabled
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={!apiKey || isTestingConnection}
            >
              {isTestingConnection ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Configuration</CardTitle>
          <CardDescription>
            Configure which HubSpot pipeline and stage to monitor for new contracts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Sales Pipeline</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Pipeline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Contract Required Stage</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contract Needed</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Deals reaching this stage will appear in your dashboard
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>
            Configure how often to sync data from HubSpot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Sync Frequency</Label>
            <Select defaultValue="15" disabled>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="auto-sync" className="rounded" disabled />
            <Label htmlFor="auto-sync" className="text-gray-500">
              Enable automatic sync
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Connect HubSpot</p>
                <p className="text-sm text-gray-500">
                  Enter your HubSpot Private App API key to establish the connection
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Configure Pipeline</p>
                <p className="text-sm text-gray-500">
                  Select which pipeline and stage should trigger contract creation
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">View Deals on Dashboard</p>
                <p className="text-sm text-gray-500">
                  Deals requiring contracts will automatically appear on your dashboard
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Create Contracts</p>
                <p className="text-sm text-gray-500">
                  Click on a deal to create a new contract, pre-filled with deal information
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled>
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
