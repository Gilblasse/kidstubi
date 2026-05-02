'use client';

import { UserButton } from '@clerk/nextjs';

export function ParentUserButton() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link
          label="Switch profile"
          labelIcon={<span aria-hidden>👤</span>}
          href="/profiles"
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
