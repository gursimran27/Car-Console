import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-ready-screen',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ready-screen.component.html',
    styleUrl: './ready-screen.component.css'
})
export class ReadyScreenComponent {
    @Input() playersConnected: number = 0;
    @Input() maxPlayers: number = 2;
    @Input() playerIndex: number | null = null;
    @Output() ready = new EventEmitter<void>();

    onTap() {
        this.ready.emit();
    }
}
