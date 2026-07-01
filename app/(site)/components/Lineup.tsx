import Reveal from "./Reveal";

type Artista = {
  nome: string;
  estilo: string;
  pais: string;
  descricao: string;
  gradient: string;
};

const ARTISTAS: Artista[] = [
  {
    nome: "Banda Cultura do Céu",
    estilo: "Louvor & Adoração",
    pais: "🇧🇷 Brasil",
    descricao:
      "Uma das bandas mais aguardadas da noite, trazendo um repertório que mistura adoração e energia pra toda a família.",
    gradient: "linear-gradient(150deg,#EF5B43,#3a0f0a)",
  },
  {
    nome: "Salomão do Reggae",
    estilo: "Reggae Gospel",
    pais: "🇯🇲 Reggae",
    descricao:
      "O peso e a levada do reggae com mensagem — pra dançar, cantar e adorar do começo ao fim.",
    gradient: "linear-gradient(150deg,#37B08A,#0d3327)",
  },
  {
    nome: "Juliane Nogueira",
    estilo: "Voz & Ministração",
    pais: "🇧🇷 Brasil",
    descricao: "Uma voz marcante que promete um dos momentos mais emocionantes da festa.",
    gradient: "linear-gradient(150deg,#F4A62A,#5c3d0b)",
  },
  {
    nome: "Kleber e Meire",
    estilo: "Dupla · Louvor",
    pais: "🇧🇷 Brasil",
    descricao: "Harmonia e ministração pra fechar a programação musical com chave de ouro.",
    gradient: "linear-gradient(150deg,#EA5C93,#4d1631)",
  },
];

export default function Lineup() {
  return (
    <Reveal id="lineup">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Atrações musicais</div>
          <h2>Line-up 2026</h2>
          <p>
            Os artistas confirmados para os dois dias de festa. Toque no play para
            assistir ao vídeo de cada um.
          </p>
        </div>

        <div className="lineup">
          {ARTISTAS.map((artista) => (
            <article className="artist" key={artista.nome}>
              <div className="artist-media">
                <div className="ph" style={{ background: artista.gradient }} />
                <div className="scrim" />
                <div className="flag">{artista.pais}</div>
                <div className="videolabel">VÍDEO</div>
                <div className="play-sm" role="img" aria-label="Assistir vídeo" />
              </div>
              <div className="artist-body">
                <h3>{artista.nome}</h3>
                <div className="role">{artista.estilo}</div>
                <p>{artista.descricao}</p>
                <a className="artist-watch" href="#">
                  ▶ Assistir vídeo
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
