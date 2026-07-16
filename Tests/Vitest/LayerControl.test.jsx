import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../../src/context/AppContext';
import LayerControl from '../../src/components/LayerControl/LayerControl';

const renderPanel = (props = {}) =>
  render(
    <MemoryRouter>
      <AppProvider>
        <LayerControl activeMapTab="wildfire" {...props} />
      </AppProvider>
    </MemoryRouter>
  );

describe('LayerControl — Infrastructure & Modeling group', () => {
  it('renders the Infrastructure & Modeling section', () => {
    renderPanel();
    expect(screen.getByText('Infrastructure & Modeling')).toBeInTheDocument();
  });

  it('shows the 3D Buildings toggle in the group', () => {
    renderPanel();
    expect(screen.getByText('3D Buildings')).toBeInTheDocument();
    expect(screen.getByText('Mapbox 3D building extrusions')).toBeInTheDocument();
  });

  it('3D Buildings is a free toggle (not Pro-locked) even without entitlements', () => {
    renderPanel({ infrastructureLayersEntitled: false, fireBehaviorModelingEntitled: false });
    const toggle = screen.getByRole('button', { name: /toggle 3d buildings/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking the 3D Buildings toggle switches it on and off', () => {
    renderPanel();
    const toggle = screen.getByRole('button', { name: /toggle 3d buildings/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it.each(['wildfire', 'weather', 'allhazard'])(
    'shows the 3D Buildings toggle on the %s tab',
    (tab) => {
      renderPanel({ activeMapTab: tab });
      expect(screen.getByText('3D Buildings')).toBeInTheDocument();
    },
  );

  it('lists 3D Buildings alongside the other infrastructure & modeling layers', () => {
    renderPanel();
    expect(screen.getByText('Critical Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('Schools & Universities')).toBeInTheDocument();
    expect(screen.getByText('Fire Behavior Modeling')).toBeInTheDocument();
    expect(screen.getByText('3D Buildings')).toBeInTheDocument();
  });
});
