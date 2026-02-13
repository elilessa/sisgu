import React from 'react';
import { Layout } from '../components/Layout';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';

export function Dashboard() {
  const { Component } = useDashboardNavigation('dashboard');

  return (
    <Layout>
      <Component />
    </Layout>
  );
}