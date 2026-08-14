import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Drawer from './Drawer';

describe('Drawer', () => {
  it('hides its dialog from the accessibility tree when closed', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}} title="Details">
        <p>Content</p>
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exposes an accessible dialog with the given title when open', () => {
    render(
      <Drawer isOpen onClose={() => {}} title="Details">
        <p>Content</p>
      </Drawer>,
    );
    expect(screen.getByRole('dialog', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls onClose when the Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer isOpen onClose={onClose} title="Details">
        <p>Content</p>
      </Drawer>,
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer isOpen onClose={onClose} title="Details">
        <p>Content</p>
      </Drawer>,
    );

    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.previousElementSibling as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
