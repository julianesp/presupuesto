export interface Config {
  vigencia: string;
  institucion: string;
  nit_institucion: string;
  rector: string;
  tesorero: string;
  mes_actual: string;
  codigo_dane: string;
}

export interface ConfigUpdate {
  vigencia?: string;
  institucion?: string;
  nit_institucion?: string;
  rector?: string;
  tesorero?: string;
  codigo_dane?: string;
}
