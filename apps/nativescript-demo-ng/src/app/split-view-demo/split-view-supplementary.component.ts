import { Component, inject, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { SplitViewState } from './split-view.state';
import { CoreTypes, EventData, GridLayout } from '@nativescript/core';

interface DeliveryCity {
  name: string;
  delivered: boolean;
  presentsCount: number;
  time?: string;
}

interface DeliveryCountry {
  title: string;
  flag: string;
  progress: number;
  items: DeliveryCity[];
}

@Component({
  selector: 'ns-split-view-supplementary',
  templateUrl: './split-view-supplementary.component.html',
  styleUrls: ['./split-view-supplementary.component.css'],
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SplitViewSupplementaryComponent {
  splitViewState = inject(SplitViewState);

  countries = signal<DeliveryCountry[]>([
    {
      title: 'United States',
      flag: '🇺🇸',
      progress: 45,
      items: [
        { name: 'New York City', delivered: true, presentsCount: 892340, time: '11:42 PM' },
        { name: 'Los Angeles', delivered: false, presentsCount: 654210 },
        { name: 'Chicago', delivered: true, presentsCount: 423150, time: '10:15 PM' },
        { name: 'Houston', delivered: false, presentsCount: 387420 },
        { name: 'Phoenix', delivered: false, presentsCount: 298760 },
      ]
    },
    {
      title: 'United Kingdom',
      flag: '🇬🇧',
      progress: 100,
      items: [
        { name: 'London', delivered: true, presentsCount: 543210, time: '7:30 PM' },
        { name: 'Manchester', delivered: true, presentsCount: 234560, time: '7:45 PM' },
        { name: 'Birmingham', delivered: true, presentsCount: 198430, time: '8:00 PM' },
      ]
    },
    {
      title: 'Japan',
      flag: '🇯🇵',
      progress: 100,
      items: [
        { name: 'Tokyo', delivered: true, presentsCount: 876540, time: '2:30 AM' },
        { name: 'Osaka', delivered: true, presentsCount: 432180, time: '3:15 AM' },
        { name: 'Kyoto', delivered: true, presentsCount: 187650, time: '3:45 AM' },
      ]
    },
    {
      title: 'Germany',
      flag: '🇩🇪',
      progress: 75,
      items: [
        { name: 'Berlin', delivered: true, presentsCount: 345670, time: '8:30 PM' },
        { name: 'Munich', delivered: true, presentsCount: 267890, time: '9:00 PM' },
        { name: 'Hamburg', delivered: true, presentsCount: 198430, time: '9:15 PM' },
        { name: 'Frankfurt', delivered: false, presentsCount: 156780 },
      ]
    },
    {
      title: 'Australia',
      flag: '🇦🇺',
      progress: 100,
      items: [
        { name: 'Sydney', delivered: true, presentsCount: 423560, time: '5:30 AM' },
        { name: 'Melbourne', delivered: true, presentsCount: 387650, time: '6:00 AM' },
        { name: 'Brisbane', delivered: true, presentsCount: 234180, time: '6:30 AM' },
      ]
    },
  ]);

  globalProgress() {
    const allCities = this.countries().flatMap(c => c.items);
    const delivered = allCities.filter(c => c.delivered).length;
    return Math.round((delivered / allCities.length) * 100);
  }

  totalDelivered() {
    return this.countries().flatMap(c => c.items).filter(c => c.delivered).length;
  }

  totalPending() {
    return this.countries().flatMap(c => c.items).filter(c => !c.delivered).length;
  }

  getDeliveredCount(country: DeliveryCountry) {
    return country.items.filter(c => c.delivered).length;
  }

  toggleDelivery(country: DeliveryCountry, city: DeliveryCity) {
    const updated = this.countries().map(c => {
      if (c.title === country.title) {
        const updatedItems = c.items.map(item => {
          if (item.name === city.name) {
            const now = new Date();
            return { 
              ...item, 
              delivered: !item.delivered,
              time: !item.delivered ? `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} PM` : undefined
            };
          }
          return item;
        });
        const deliveredCount = updatedItems.filter(i => i.delivered).length;
        return { ...c, items: updatedItems, progress: Math.round((deliveredCount / updatedItems.length) * 100) };
      }
      return c;
    });
    this.countries.set(updated);
    this.splitViewState.deliveredCount.set(this.totalDelivered());
  }

  startLiveIndicatorAnimation(args: EventData) {
    const grid = args.object as GridLayout;

    const animate = () => {
      grid
        .animate({
          opacity: 0.4,
          duration: 800,
          curve: CoreTypes.AnimationCurve.easeInOut
        })
        .then(() => {
          return grid.animate({
            opacity: 1,
            duration: 800,
            curve: CoreTypes.AnimationCurve.easeInOut
          });
        })
        .then(() => {
          animate();
        })
        .catch(() => {});
    };

    animate();
  }
}
