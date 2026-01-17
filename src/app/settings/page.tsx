'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Bell,
  Link2,
  Database,
  Shield,
  ChevronRight,
} from 'lucide-react';

const settingsSections = [
  {
    title: 'Profile',
    description: 'Manage your account settings and preferences',
    icon: User,
    href: '/settings/profile',
    status: null,
  },
  {
    title: 'Notifications',
    description: 'Configure email notifications and reminders',
    icon: Bell,
    href: '/settings/notifications',
    status: null,
  },
  {
    title: 'HubSpot Integration',
    description: 'Connect HubSpot to sync deals requiring contracts',
    icon: Link2,
    href: '/settings/hubspot',
    status: 'coming-soon',
  },
  {
    title: 'Data Management',
    description: 'Import, export, and manage contract data',
    icon: Database,
    href: '/settings/data',
    status: null,
  },
  {
    title: 'Access Control',
    description: 'Manage users and permissions (Admin only)',
    icon: Shield,
    href: '/settings/access',
    status: 'admin',
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">
          Manage your preferences and integrations
        </p>
      </div>

      {/* Settings sections */}
      <div className="grid gap-4">
        {settingsSections.map((section) => (
          <Link key={section.title} href={section.href}>
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <section.icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {section.title}
                      </h3>
                      {section.status === 'coming-soon' && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          Coming Soon
                        </Badge>
                      )}
                      {section.status === 'admin' && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* App info */}
      <Card>
        <CardHeader>
          <CardTitle>About ConMS</CardTitle>
          <CardDescription>Contract Management System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p><strong>Version:</strong> 1.0.0 MVP</p>
          <p><strong>Organization:</strong> Symbio</p>
          <p><strong>Support:</strong> Contact your IT administrator</p>
        </CardContent>
      </Card>
    </div>
  );
}
