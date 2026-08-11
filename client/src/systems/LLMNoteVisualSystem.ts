/**
 * LLMNoteVisualSystem.ts
 * Observer system for LLM objective notes and dynamic tactical notifications.
 */
import { MatchController } from "../../MatchController";

export interface LLMNoteEvent {
  id: string;
  sender: string;
  text: string;
  priority: "low" | "medium" | "high";
  timestamp: number;
}

export class LLMNoteVisualSystem {
  private match: MatchController;
  private container: HTMLElement | null = null;
  private activeNotes: LLMNoteEvent[] = [];

  constructor(match: MatchController) {
    this.match = match;
  }

  public init() {
    this.container = document.getElementById("llm-notes-container");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "llm-notes-container";
      this.container.style.position = "absolute";
      this.container.style.top = "15%";
      this.container.style.right = "20px";
      this.container.style.width = "280px";
      this.container.style.pointerEvents = "none";
      this.container.style.zIndex = "35";
      document.body.appendChild(this.container);
    }
  }

  public notifyNote(note: LLMNoteEvent) {
    this.activeNotes.push(note);
    this.renderNoteCard(note);
  }

  private renderNoteCard(note: LLMNoteEvent) {
    if (!this.container) return;

    const card = document.createElement("div");
    card.id = `llm-note-${note.id}`;
    card.style.background = "rgba(10, 15, 25, 0.85)";
    card.style.borderLeft = note.priority === "high" ? "4px solid #ef4444" : "4px solid #3b82f6";
    card.style.backdropFilter = "blur(8px)";
    card.style.color = "#ffffff";
    card.style.padding = "10px 14px";
    card.style.marginBottom = "8px";
    card.style.borderRadius = "4px";
    card.style.fontFamily = "monospace";
    card.style.fontSize = "12px";
    card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
    card.style.transition = "all 0.3s ease";

    card.innerHTML = `
      <div style="font-weight:bold;color:#60a5fa;margin-bottom:4px;display:flex;justify-content:space-between;">
        <span>[TACTICAL INTEL] ${note.sender}</span>
        <span style="font-size:10px;opacity:0.6;">${new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div>${note.text}</div>
    `;

    this.container.appendChild(card);

    setTimeout(() => {
      card.style.opacity = "0";
      card.style.transform = "translateX(30px)";
      setTimeout(() => card.remove(), 300);
    }, 5000);
  }

  public update(dt: number) {
    // Periodic updates or animation processing
  }

  public dispose() {
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.activeNotes = [];
  }
}
