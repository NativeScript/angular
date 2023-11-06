import { Injectable } from '@angular/core';

import { Item } from './item';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private items = new Array<Item>(
    { id: 1, name: 'The', role: 'Goalkeeper' },
    { id: 3, name: 'JavaScript', role: 'Defender' },
    { id: 4, name: 'Ecosystem', role: 'Midfielder' },
    { id: 5, name: 'Is', role: 'Midfielder' },
    { id: 6, name: 'For', role: 'Midfielder' },
    { id: 7, name: 'Everyone.', role: 'Midfielder' },
    { id: 8, name: 'Welcome beginners,', role: 'Midfielder' },
    { id: 9, name: 'intermediate,', role: 'Forward' },
    { id: 10, name: 'and advanced programmers.', role: 'Forward' },
    { id: 11, name: 'Celebrate web tech', role: 'Forward' },
    { id: 12, name: 'with native platform tech.', role: 'Midfielder' },
    { id: 13, name: 'Find', role: 'Goalkeeper' },
    { id: 14, name: 'wonderful learning', role: 'Defender' },
    { id: 17, name: 'learning', role: 'Forward' },
    { id: 18, name: 'resources', role: 'Defender' },
    { id: 19, name: 'across', role: 'Defender' },
    { id: 20, name: 'the', role: 'Midfielder' },
    { id: 21, name: 'entire', role: 'Midfielder' },
    { id: 22, name: 'web', role: 'Midfielder' },
    { id: 23, name: 'community', role: 'Defender' },
    { id: 24, name: 'to', role: 'Defender' },
    { id: 25, name: 'Get Started!', role: 'Goalkeeper' }
  );

  flavors = [
    {
      color: '#087ea4',
      logo: '~/assets/react.png'
    },
    {
      color: '#2c4f7c',
      logo: '~/assets/solid.png'
    },
    {
      color: '#eb4e27',
      logo: '~/assets/svelte.png'
    },
    {
      color: '#64b788',
      logo: '~/assets/vue.png'
    }
  ];
  currentFlavor = 0;

  getItems(): Array<Item> {
    return this.items;
  }

  getItem(id: number): Item {
    return this.items.filter(item => item.id === id)[0];
  }
}
