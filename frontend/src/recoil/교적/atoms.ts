import { atom } from 'recoil';
import { MemberRow } from '@/models/교적.types';
import { PageMeta } from '@/models/common.types';

export const membersState = atom({
  key: 'membersState',
  default: {
    items: [] as MemberRow[],
    loading: false,
    pagination: {
      current_page: 1,
      page_size: 10,
      total_items: 0,
    } as PageMeta,
  },
});

export const selectedMemberIdsState = atom({
  key: 'selectedMemberIdsState',
  default: [] as string[],
});
