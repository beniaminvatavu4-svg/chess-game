import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Chess, Square } from 'chess.js';
import { Subscription } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { Game } from '../../models/game.model';

interface BoardSquare {
  square: Square;
  piece: string | null;
  isLight: boolean;
  isSelected: boolean;
  isValidMove: boolean;
  rankLabel: string | null;
  fileLabel: string | null;
}

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class BoardComponent implements OnInit, OnDestroy {
  game: Game | null = null;
  chess = new Chess();
  board: BoardSquare[][] = [];
  selectedSquare: Square | null = null;
  color: 'white' | 'black' = 'white';
  gameId = '';
  statusMessage = 'Connecting…';

  private sub = new Subscription();

  constructor(private route: ActivatedRoute, private socket: SocketService) {}

  ngOnInit(): void {
    this.gameId = this.route.snapshot.paramMap.get('id') ?? '';
    this.color = (this.route.snapshot.queryParamMap.get('color') ?? 'white') as 'white' | 'black';

    this.socket.joinGame(this.gameId, this.color);

    this.sub.add(
      this.socket.onGameUpdate().subscribe((game) => {
        this.game = game;
        this.chess.load(game.fen);
        this.renderBoard();
        this.updateStatus();
      })
    );

    this.sub.add(
      this.socket.onInvalidMove().subscribe(() => {
        this.statusMessage = 'Invalid move — try again.';
      })
    );
  }

  renderBoard(): void {
    const boardData = this.chess.board();
    const ranks = this.color === 'black' ? [...boardData].reverse() : boardData;
    this.board = ranks.map((rank, ri) => {
      const files = this.color === 'black' ? [...rank].reverse() : rank;
      return files.map((cell, fi) => {
        const rankIdx = this.color === 'black' ? ri : 7 - ri;
        const fileIdx = this.color === 'black' ? 7 - fi : fi;
        const square = (String.fromCharCode(97 + fileIdx) + (rankIdx + 1)) as Square;
        return {
          square,
          piece: cell ? `${cell.color}${cell.type}` : null,
          isLight: (ri + fi) % 2 === 0,
          isSelected: square === this.selectedSquare,
          isValidMove: false,
          rankLabel: fi === 0 ? square[1] : null,
          fileLabel: ri === ranks.length - 1 ? square[0] : null,
        };
      });
    });
  }

  onSquareClick(sq: BoardSquare): void {
    const ownColor = this.color === 'white' ? 'w' : 'b';

    if (this.selectedSquare) {
      if (sq.piece && sq.piece[0] === ownColor) {
        this.selectedSquare = sq.square;
        this.highlightMoves(sq.square);
      } else if (
        this.game?.status === 'active' &&
        (this.chess.turn() === 'w') === (this.color === 'white')
      ) {
        this.socket.makeMove(this.gameId, `${this.selectedSquare}${sq.square}`);
        this.selectedSquare = null;
        this.clearHighlights();
      } else {
        this.selectedSquare = null;
        this.clearHighlights();
      }
    } else if (sq.piece && sq.piece[0] === ownColor) {
      this.selectedSquare = sq.square;
      this.highlightMoves(sq.square);
    }
  }

  get joinUrl(): string {
    return `${window.location.origin}/game/${this.gameId}?color=black`;
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.joinUrl).then(() => {
      this.statusMessage = 'Link copiat!';
      setTimeout(() => this.updateStatus(), 2000);
    });
  }

  highlightMoves(from: Square): void {
    const moves = this.chess.moves({ square: from, verbose: true });
    const targets = new Set(moves.map((m) => m.to));
    this.board = this.board.map((rank) =>
      rank.map((sq) => ({
        ...sq,
        isSelected: sq.square === from,
        isValidMove: targets.has(sq.square),
      }))
    );
  }

  clearHighlights(): void {
    this.board = this.board.map((rank) =>
      rank.map((sq) => ({ ...sq, isSelected: false, isValidMove: false }))
    );
  }

  updateStatus(): void {
    if (!this.game) return;
    if (this.game.status === 'waiting') { this.statusMessage = 'Waiting for opponent…'; return; }
    if (this.game.status === 'finished') {
      this.statusMessage = this.game.winner === 'draw' ? 'Draw!' : `${this.game.winner} wins!`;
      return;
    }
    const myTurn = (this.chess.turn() === 'w') === (this.color === 'white');
    this.statusMessage = myTurn ? 'Your turn' : "Opponent's turn";
  }

  pieceSymbol(code: string | null): string {
    if (!code) return '';
    const map: Record<string, string> = {
      wp: '♙', wr: '♖', wn: '♘', wb: '♗', wq: '♕', wk: '♔',
      bp: '♟', br: '♜', bn: '♞', bb: '♝', bq: '♛', bk: '♚',
    };
    return map[code] ?? '';
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
