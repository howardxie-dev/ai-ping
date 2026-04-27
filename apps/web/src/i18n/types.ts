export const supportedLocales = ["en", "zh-Hans", "zh-Hant"] as const;

export type Locale = (typeof supportedLocales)[number];

export type Messages = WidenStrings<typeof import("./en").messages>;

export type MessageKey = LeafPaths<Messages>;

type WidenStrings<Value> = Value extends string
  ? string
  : Value extends readonly string[]
    ? readonly string[]
    : {
        readonly [Key in keyof Value]: WidenStrings<Value[Key]>;
      };

type Join<Prefix extends string, Key extends string> = Prefix extends ""
  ? Key
  : `${Prefix}.${Key}`;

type LeafPaths<Value, Prefix extends string = ""> = Value extends string
  ? Prefix
  : Value extends readonly string[]
    ? Prefix
    : {
        [Key in keyof Value & string]: LeafPaths<Value[Key], Join<Prefix, Key>>;
      }[keyof Value & string];
