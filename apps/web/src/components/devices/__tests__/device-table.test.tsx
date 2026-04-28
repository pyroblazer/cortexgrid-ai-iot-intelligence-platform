import '@testing-library/jest-dom';
/**
 * Unit tests for DeviceTable component (src/components/devices/device-table.tsx)
 *
 * Tests:
 * - Renders device rows with correct data
 * - Calls onView when view button clicked
 * - Calls onEdit when edit button clicked
 * - Calls onDelete when delete button clicked
 * - Shows correct status indicator
 * - Shows device type badges
 * - Shows empty message when no devices
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceTable } from '@/components/devices/device-table';
import type { DeviceResponse } from '@cortexgrid/types';

// Mock @cortexgrid/ui/components/Badge
jest.mock('@cortexgrid/ui/components/Badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
  badgeVariants: {},
}));

// Mock @cortexgrid/ui/components/StatusIndicator
jest.mock('@cortexgrid/ui/components/StatusIndicator', () => ({
  StatusIndicator: ({ status, label }: any) => (
    <span data-testid="status-indicator" data-status={status}>
      {label}
    </span>
  ),
  statusVariants: {},
}));

// Mock @cortexgrid/ui/components/DataTable
jest.mock('@cortexgrid/ui/components/DataTable', () => ({
  DataTable: ({ columns, data, emptyMessage }: any) => {
    if (data.length === 0) {
      return <div data-testid="empty-message">{emptyMessage}</div>;
    }
    return (
      <table data-testid="data-table">
        <tbody>
          {data.map((row: any) => (
            <tr key={row.id} data-testid={`row-${row.id}`}>
              {columns.map((col: any) => (
                <td key={col.key} data-testid={`cell-${col.key}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
}));

jest.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon">View</span>,
  Pencil: () => <span data-testid="pencil-icon">Edit</span>,
  Trash2: () => <span data-testid="trash-icon">Delete</span>,
}));

jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
}));

const mockDevices: DeviceResponse[] = [
  {
    id: 'dev-1',
    name: 'Temperature Sensor A1',
    description: 'Measures temperature',
    type: 'SENSOR' as any,
    status: 'ONLINE' as any,
    organizationId: 'org-1',
    location: 'Building A',
    tags: [],
    isConnected: true,
    lastSeenAt: '2024-06-15T12:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-15T12:00:00Z',
  },
  {
    id: 'dev-2',
    name: 'Motion Detector C1',
    description: 'Detects motion',
    type: 'ACTUATOR' as any,
    status: 'OFFLINE' as any,
    organizationId: 'org-1',
    location: 'Building B',
    tags: [],
    isConnected: false,
    lastSeenAt: null as any,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-15T12:00:00Z',
  },
  {
    id: 'dev-3',
    name: 'Edge Gateway Alpha',
    type: 'GATEWAY' as any,
    status: 'MAINTENANCE' as any,
    organizationId: 'org-1',
    tags: [],
    isConnected: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-15T12:00:00Z',
  },
];

describe('DeviceTable component', () => {
  const defaultProps = {
    devices: mockDevices,
    onView: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a table with device data', () => {
    render(<DeviceTable {...defaultProps} />);
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('renders device names', () => {
    render(<DeviceTable {...defaultProps} />);
    expect(screen.getByText('Temperature Sensor A1')).toBeInTheDocument();
    expect(screen.getByText('Motion Detector C1')).toBeInTheDocument();
    expect(screen.getByText('Edge Gateway Alpha')).toBeInTheDocument();
  });

  it('renders device descriptions', () => {
    render(<DeviceTable {...defaultProps} />);
    expect(screen.getByText('Measures temperature')).toBeInTheDocument();
    expect(screen.getByText('Detects motion')).toBeInTheDocument();
  });

  it('shows ONLINE status correctly', () => {
    render(<DeviceTable {...defaultProps} />);
    const statusIndicators = screen.getAllByTestId('status-indicator');
    expect(statusIndicators[0]).toHaveAttribute('data-status', 'online');
    expect(statusIndicators[0]).toHaveTextContent('ONLINE');
  });

  it('shows OFFLINE status correctly', () => {
    render(<DeviceTable {...defaultProps} />);
    const statusIndicators = screen.getAllByTestId('status-indicator');
    expect(statusIndicators[1]).toHaveAttribute('data-status', 'offline');
    expect(statusIndicators[1]).toHaveTextContent('OFFLINE');
  });

  it('shows MAINTENANCE status correctly', () => {
    render(<DeviceTable {...defaultProps} />);
    const statusIndicators = screen.getAllByTestId('status-indicator');
    expect(statusIndicators[2]).toHaveAttribute('data-status', 'maintenance');
    expect(statusIndicators[2]).toHaveTextContent('MAINTENANCE');
  });

  it('shows device type badges', () => {
    render(<DeviceTable {...defaultProps} />);
    const badges = screen.getAllByTestId('badge');
    expect(badges[0]).toHaveTextContent('Sensor');
    expect(badges[1]).toHaveTextContent('Actuator');
    expect(badges[2]).toHaveTextContent('Gateway');
  });

  it('shows location', () => {
    render(<DeviceTable {...defaultProps} />);
    expect(screen.getByText('Building A')).toBeInTheDocument();
    expect(screen.getByText('Building B')).toBeInTheDocument();
  });

  it('shows N/A for missing location', () => {
    render(<DeviceTable {...defaultProps} />);
    // dev-3 has no location
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('shows last seen time', () => {
    render(<DeviceTable {...defaultProps} />);
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('shows "Never" for devices with no lastSeenAt', () => {
    render(<DeviceTable {...defaultProps} />);
    expect(screen.getAllByText('Never').length).toBeGreaterThan(0);
  });

  it('calls onView when view button is clicked', () => {
    render(<DeviceTable {...defaultProps} />);
    // Find view button by aria-label for the first device
    const viewButtons = screen.getAllByLabelText(/^View /);
    fireEvent.click(viewButtons[0]);
    expect(defaultProps.onView).toHaveBeenCalledWith('dev-1');
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<DeviceTable {...defaultProps} />);
    const editButtons = screen.getAllByLabelText(/^Edit /);
    fireEvent.click(editButtons[0]);
    expect(defaultProps.onEdit).toHaveBeenCalledWith('dev-1');
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<DeviceTable {...defaultProps} />);
    const deleteButtons = screen.getAllByLabelText(/^Delete /);
    fireEvent.click(deleteButtons[0]);
    expect(defaultProps.onDelete).toHaveBeenCalledWith('dev-1');
  });

  it('calls onView for different devices', () => {
    render(<DeviceTable {...defaultProps} />);
    const viewButtons = screen.getAllByLabelText(/^View /);
    fireEvent.click(viewButtons[1]);
    expect(defaultProps.onView).toHaveBeenCalledWith('dev-2');
  });

  it('shows empty message when no devices', () => {
    render(<DeviceTable {...defaultProps} devices={[]} />);
    expect(screen.getByTestId('empty-message')).toHaveTextContent(
      'No devices found. Add your first device to get started.'
    );
  });

  it('renders action buttons for each device', () => {
    render(<DeviceTable {...defaultProps} />);
    expect(screen.getAllByTestId('eye-icon')).toHaveLength(3);
    expect(screen.getAllByTestId('pencil-icon')).toHaveLength(3);
    expect(screen.getAllByTestId('trash-icon')).toHaveLength(3);
  });
});
