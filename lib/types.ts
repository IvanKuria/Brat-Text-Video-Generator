export interface Word {
  text: string;
  startMs: number;
  endMs: number;
}

// a frame is an array of lines; each line is an array of indices into words[]
export type Page = number[][];

export type Aspect = "9x16" | "16x9";
export type TextAnchor = "top" | "center" | "bottom";
