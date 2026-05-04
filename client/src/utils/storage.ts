const NICKNAME_KEY = 'doudizhu_nickname';

export function loadNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) || '';
}

export function saveNickname(name: string) {
  localStorage.setItem(NICKNAME_KEY, name);
}
