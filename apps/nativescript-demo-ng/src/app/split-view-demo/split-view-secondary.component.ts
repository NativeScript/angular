import { Component, inject, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { SplitViewState } from './split-view.state';

interface ListPerson {
  name: string;
  age: number;
  city: string;
  status: 'naughty' | 'nice';
  reason: string;
  avatar: string;
}

@Component({
  selector: 'ns-split-view-secondary',
  templateUrl: './split-view-secondary.component.html',
  styleUrls: ['./split-view-secondary.component.css'],
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SplitViewSecondaryComponent {
  splitViewState = inject(SplitViewState);
  activeTab = signal<'nice' | 'naughty'>('nice');

  people = signal<ListPerson[]>([
    { name: 'Emma Thompson', age: 8, city: 'London', status: 'nice', reason: 'Helped elderly neighbor', avatar: '👧' },
    { name: 'Liam Chen', age: 6, city: 'Tokyo', status: 'nice', reason: 'Shared toys with sister', avatar: '👦' },
    { name: 'Sofia Martinez', age: 9, city: 'Madrid', status: 'nice', reason: 'Cleaned room every day', avatar: '👧' },
    { name: 'Oliver Smith', age: 7, city: 'New York', status: 'naughty', reason: 'Pulled cat\'s tail', avatar: '👦' },
    { name: 'Mia Johnson', age: 5, city: 'Sydney', status: 'nice', reason: 'Said please and thank you', avatar: '👧' },
    { name: 'Noah Williams', age: 10, city: 'Toronto', status: 'naughty', reason: 'Ate all the cookies', avatar: '👦' },
    { name: 'Isabella Brown', age: 8, city: 'Paris', status: 'nice', reason: 'Made birthday card for mom', avatar: '👧' },
    { name: 'Lucas Garcia', age: 7, city: 'Mexico City', status: 'naughty', reason: 'Drew on walls', avatar: '👦' },
    { name: 'Ava Davis', age: 6, city: 'Berlin', status: 'nice', reason: 'Helped with chores', avatar: '👧' },
    { name: 'Ethan Wilson', age: 9, city: 'Dublin', status: 'nice', reason: 'Tutored younger kids', avatar: '👦' },
  ]);

  constructor() {
    this.updateCounts();
  }

  filteredList() {
    return this.people().filter(p => p.status === this.activeTab());
  }

  setActiveTab(tab: 'nice' | 'naughty') {
    this.activeTab.set(tab);
  }

  toggleStatus(person: ListPerson) {
    const updated = this.people().map(p => {
      if (p.name === person.name) {
        return { ...p, status: p.status === 'nice' ? 'naughty' as const : 'nice' as const };
      }
      return p;
    });
    this.people.set(updated);
    this.updateCounts();
  }

  updateCounts() {
    const nice = this.people().filter(p => p.status === 'nice').length;
    const naughty = this.people().filter(p => p.status === 'naughty').length;
    this.splitViewState.niceCount.set(nice);
    this.splitViewState.naughtyCount.set(naughty);
  }

  addRandomPerson() {
    const names = ['Jack', 'Emily', 'James', 'Charlotte', 'Henry', 'Amelia', 'Alexander', 'Harper'];
    const cities = ['Oslo', 'Stockholm', 'Helsinki', 'Copenhagen', 'Amsterdam', 'Brussels', 'Vienna', 'Prague'];
    const niceReasons = ['Did homework on time', 'Was kind to animals', 'Helped a friend', 'Cleaned up toys'];
    const naughtyReasons = ['Forgot to brush teeth', 'Stayed up too late', 'Didn\'t eat vegetables', 'Was too loud'];
    const avatars = ['👦', '👧', '🧒'];
    
    const isNice = Math.random() > 0.3;
    const newPerson: ListPerson = {
      name: names[Math.floor(Math.random() * names.length)] + ' ' + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + '.',
      age: Math.floor(Math.random() * 8) + 4,
      city: cities[Math.floor(Math.random() * cities.length)],
      status: isNice ? 'nice' : 'naughty',
      reason: isNice ? niceReasons[Math.floor(Math.random() * niceReasons.length)] : naughtyReasons[Math.floor(Math.random() * naughtyReasons.length)],
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
    };
    
    this.people.update(list => [...list, newPerson]);
    this.updateCounts();
  }
}
