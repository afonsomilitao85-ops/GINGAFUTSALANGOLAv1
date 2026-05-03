import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  Users, 
  PlayCircle, 
  Trophy, 
  ShoppingBag, 
  User, 
  BarChart3, 
  LogOut,
  ChevronRight,
  ChevronLeft,
  Search,
  Bell,
  Plus,
  Calendar,
  MapPin,
  Heart,
  Star,
  Share2,
  X,
  Video,
  Image as ImageIcon,
  Phone,
  Mail,
  Lock,
  CreditCard,
  CheckCircle2,
  Zap,
  MessageCircle,
  BellRing,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Edit,
  Camera,
  Check,
  Facebook,
  Instagram,
  Music2,
  ExternalLink,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
} from './firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  increment,
  where,
  getDocs,
  ref,
  uploadBytesResumable,
  uploadBytes,
  getDownloadURL,
  storage,
  OperationType,
  handleFirestoreError
} from './firebase';

// --- Types ---
type Screen = 'inicio' | 'pelada' | 'live' | 'competicoes' | 'mercado' | 'perfil' | 'scout' | 'reservas' | 'monetizacao' | 'ranking' | 'convite' | 'notificacoes' | 'admin' | 'sobre' | 'messenger';

interface Notification {
  id: string;
  type: 'like' | 'game' | 'comment';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  avatar?: string;
}

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'golo' | 'inicio' | 'fim' | 'info';
  equipaA: string;
  equipaB: string;
  golosA?: number;
  golosB?: number;
}

interface Post {
  id: string;
  authorUid: string;
  nome: string;
  bairro: string;
  likes: number;
  image: string;
  avatar: string;
  videoUrl: string;
  createdAt: number;
  isPro?: boolean;
  type?: 'video' | 'photo';
}

interface GameEvent {
  tipo: 'golo' | 'cartao_amarelo' | 'cartao_vermelho';
  jogador: string;
  equipa: string;
  minuto: number;
}

interface Match {
  id: string;
  equipaA: string;
  equipaB: string;
  equipaAId?: string;
  equipaBId?: string;
  golosA: number;
  golosB: number;
  tempo: string;
  status: 'agendado' | 'ao_vivo' | 'finalizado' | 'AGENDADO' | 'AO VIVO' | 'FINALIZADO';
  ligaId?: string;
  liga?: string;
  grupo?: string | null;
  data?: any;
  jornada?: number;
  hora?: string;
  local?: string;
  campo?: string;
  tempoAtual?: number;
  tempoMaximo?: number;
  estadoTempo?: 'nao_iniciado' | 'a_decorrer' | 'intervalo' | 'pausado' | 'finalizado';
  eventos?: GameEvent[];
  timestamp?: number;
}

interface League {
  id: string;
  nome: string;
  regiao: string;
  logo?: string;
  temporada?: string;
  modoCompeticao?: 'liga' | 'grupos';
  createdBy: string;
}

interface Team {
  id: string;
  nome: string;
  logo?: string;
  ligaId: string;
  grupo?: string | null;
  createdBy: string;
  // Campos de Classificação
  vitorias?: number;
  empates?: number;
  derrotas?: number;
  golosMarcados?: number;
  golosSofridos?: number;
  // Expansão Perfil
  cidade?: string;
  descricao?: string;
  ajustePontos?: number;
  ajusteGM?: number;
  ajusteGS?: number;
  ajusteTotalGM?: number;
  ajusteTotalGS?: number;
}

interface Participation {
  id: string;
  equipaId: string;
  competicaoId: string;
  grupo?: string | null;
  criadoEm: number;
}

interface LeaguePlayer {
  id: string;
  nome: string;
  posicao: string;
  numero: number;
  equipaId: string;
  // Expansão Atleta
  golos?: number;
  assistencias?: number;
  foto?: string;
}

interface Product {
  id: string;
  authorUid: string;
  title: string;
  price: string;
  img: string;
  whatsapp: string;
  isFeatured?: boolean;
}

interface Player {
  id: number;
  name: string;
  pos: string;
  rating: string;
  team: string;
}

interface UserProfile {
  uid: string;
  email: string;
  nome: string;
  bairro: string;
  jogos: number;
  golos: number;
  mvps: number;
  ranking: string;
  isPro?: boolean;
  avatar?: string;
  provider?: string;
  createdAt?: any;
  role?: 'admin' | 'user';
  bio?: string;
  localizacao?: string;
}

// --- Constants ---
const SCREEN_TITLES: Record<string, string> = {
  inicio: "GINGA FUTSAL",
  pelada: "PELADAS",
  live: "AO VIVO",
  competicoes: "COMPETIÇÕES",
  mercado: "MERCADO",
  perfil: "PERFIL",
  scout: "SCOUT",
  reservas: "RESERVAS",
  monetizacao: "GINGA PRO",
  ranking: "RANKING",
  convite: "CONVITE",
  notificacoes: "NOTIFICAÇÕES",
  admin: "ÁREA ADMIN",
  sobre: "SOBRE",
  messenger: "MESSENGER"
};

// --- Mock Data ---
const INITIAL_POSTS: Post[] = [
  { 
    id: '1', 
    authorUid: 'user_ginga',
    nome: 'Ricardo Ginga', 
    bairro: 'Maianga, Luanda', 
    likes: 1200, 
    image: 'https://picsum.photos/seed/player-1/600/750', 
    avatar: 'https://picsum.photos/seed/avatar-1/100/100',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futsal-player-dribbling-with-the-ball-34405-large.mp4',
    createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    isPro: true
  },
  { 
    id: '2', 
    authorUid: 'user_mauro',
    nome: 'Mauro Artista', 
    bairro: 'Kilamba, Luanda', 
    likes: 850, 
    image: 'https://picsum.photos/seed/player-2/600/750', 
    avatar: 'https://picsum.photos/seed/avatar-2/100/100',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-soccer-player-kicking-the-ball-in-slow-motion-40455-large.mp4',
    createdAt: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago (Expired for normal, but would show if PRO)
  },
  { 
    id: '3', 
    authorUid: 'user_zico',
    nome: 'Zico Futsal', 
    bairro: 'Samba, Luanda', 
    likes: 2300, 
    image: 'https://picsum.photos/seed/player-3/600/750', 
    avatar: 'https://picsum.photos/seed/avatar-3/100/100',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-man-playing-with-a-soccer-ball-in-the-street-40454-large.mp4',
    createdAt: Date.now() - 10 * 60 * 60 * 1000 // 10 hours ago
  },
];

const INITIAL_GAMES: Match[] = [
  { id: '1', equipaA: 'Kilamba FC', equipaB: 'Samba Futsal', golosA: 2, golosB: 1, tempo: "32'", status: 'AO VIVO', liga: 'Liga Ginga Luanda' },
  { id: '2', equipaA: 'Maianga United', equipaB: 'Viana Pro', golosA: 4, golosB: 4, tempo: 'Fim', status: 'FINALIZADO', liga: 'Taça Ginga Pro' },
  { id: '3', equipaA: 'Samba Pro', equipaB: 'Luanda City', golosA: 0, golosB: 0, tempo: "12'", status: 'AO VIVO', liga: 'Liga Elite Luanda' },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', authorUid: 'admin', title: 'Chuteiras Profissionais Nike', price: '45.000 Kz', img: 'product1', whatsapp: '244900000000' },
  { id: '2', authorUid: 'admin', title: 'Equipamento Completo Ginga', price: '12.000 Kz', img: 'product2', whatsapp: '244900000000' },
  { id: '3', authorUid: 'admin', title: 'Bola de Futsal Oficial', price: '8.500 Kz', img: 'product3', whatsapp: '244900000000' },
];

const INITIAL_PLAYERS: Player[] = [
  { id: 1, name: 'Leozinho', pos: 'Ala', rating: '9.8', team: 'Magnus' },
  { id: 2, name: 'Pito', pos: 'Pivô', rating: '9.5', team: 'Barcelona' },
  { id: 3, name: 'Ferrão', pos: 'Pivô', rating: '9.4', team: 'Barcelona' },
  { id: 4, name: 'Guitta', pos: 'Goleiro', rating: '9.2', team: 'Sporting' },
  { id: 5, name: 'Dyego', pos: 'Ala', rating: '9.1', team: 'Barcelona' },
];

const USER_DATA: UserProfile = {
  uid: 'user_123',
  email: 'atleta@gingafutsal.com',
  nome: 'Falcão Júnior',
  bairro: 'Luanda, AO',
  jogos: 42,
  golos: 128,
  mvps: 15,
  ranking: '#12 em Luanda',
  isPro: false
};

// --- Simulated Auth Service (Firebase Placeholder) ---
const authService = {
  signIn: async (email: string, pass: string): Promise<UserProfile> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { ...USER_DATA, email };
  },
  signOut: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};

// --- Components ---

const Navbar = ({ activeScreen, setActiveScreen }: { activeScreen: Screen, setActiveScreen: (s: Screen) => void }) => {
  const navItems = [
    { id: 'inicio', icon: Home, label: 'HOME' },
    { id: 'pelada', icon: PlayCircle, label: 'PELADAS' },
    { id: 'scout', icon: Search, label: 'SCOUT' },
    { id: 'live', icon: Video, label: 'AO VIVO' },
    { id: 'competicoes', icon: Trophy, label: 'COPAS' },
    { id: 'mercado', icon: ShoppingBag, label: 'MERCADO' },
    { id: 'perfil', icon: User, label: 'PERFIL' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 px-2 py-3 z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveScreen(item.id as Screen)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${
              activeScreen === item.id ? 'text-accent scale-110' : 'text-white/50'
            }`}
          >
            <item.icon size={18} strokeWidth={activeScreen === item.id ? 2.5 : 2} />
            <span className="text-[8px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

const Header = ({ title, onScoutClick, onNotificationClick, onChatClick, hasUnread }: { 
  title: string, 
  onScoutClick?: () => void,
  onNotificationClick?: () => void,
  onChatClick?: () => void,
  hasUnread?: boolean
}) => (
  <header className="sticky top-0 glass border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center z-40">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 sm:w-10 sm:h-10 overflow-hidden rounded-xl bg-white flex items-center justify-center shadow-lg shadow-accent/20 border-2 border-accent/20">
        <img 
          src="/logo.png" 
          alt="GINGAFUTSAL Logo" 
          className="w-full h-full object-contain p-0.5 rounded-lg" 
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://scontent.flad8-1.fna.fbcdn.net/v/t39.30808-6/679992172_122093803274358122_3249315041292680989_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=1d70fc&_nc_ohc=7rp-NwTL0k8Q7kNvwEPNlxP&_nc_oc=AdqWWxfqEPs3JFfD94Z1DKRSw-FhhXJADb3zcfXj4pMUyPkKaOZhM3-xOnj9ZrCQYYo&_nc_zt=23&_nc_ht=scontent.flad8-1.fna&_nc_gid=LKmB6mtfA7iiP9Ivm9apEg&oh=00_Af0lHEhGmWhHnwrfACyaq8ENiHtuqshEXuovRwHIqklb9g&oe=69F02CEB';
          }}
        />
      </div>
      <h1 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h1>
    </div>
    <div className="flex items-center gap-1 sm:gap-2">
      <button 
        onClick={onChatClick}
        className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/70 hover:text-white"
      >
        <MessageCircle size={20} />
      </button>
      <button 
        onClick={onNotificationClick}
        className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/70 hover:text-white relative"
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-[#0A0F1C]" />
        )}
      </button>
    </div>
  </header>
);

// --- Screens ---

const WelcomeScreen = ({ onEnterApp, onAdminLogin }: { onEnterApp: () => void, onAdminLogin: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden bg-transparent">
      <div className="w-full max-w-md space-y-12 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-32 h-32 overflow-hidden rounded-[2.5rem] bg-white flex items-center justify-center mx-auto shadow-2xl shadow-accent/20 border-4 border-accent/20"
        >
          <img 
            src="/logo.png" 
            alt="GINGAFUTSAL Logo" 
            className="w-full h-full object-contain p-2 rounded-[2rem]" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://scontent.flad8-1.fna.fbcdn.net/v/t39.30808-6/679992172_122093803274358122_3249315041292680989_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=1d70fc&_nc_ohc=7rp-NwTL0k8Q7kNvwEPNlxP&_nc_oc=AdqWWxfqEPs3JFfD94Z1DKRSw-FhhXJADb3zcfXj4pMUyPkKaOZhM3-xOnj9ZrCQYYo&_nc_zt=23&_nc_ht=scontent.flad8-1.fna&_nc_gid=LKmB6mtfA7iiP9Ivm9apEg&oh=00_Af0lHEhGmWhHnwrfACyaq8ENiHtuqshEXuovRwHIqklb9g&oe=69F02CEB';
            }}
          />
        </motion.div>

        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-5xl font-black italic tracking-tighter"
          >
            GINGA<span className="text-accent">FUTSAL</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-white/60 font-medium text-lg leading-relaxed"
          >
            “O futuro do futsal angolano”
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="space-y-4 pt-8"
        >
          <button 
            id="btnEntrar"
            onClick={onEnterApp}
            className="w-full bg-accent text-white font-black py-5 rounded-2xl shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg uppercase tracking-widest"
          >
            Entrar na App
            <ChevronRight size={24} />
          </button>
          
          <button 
            id="adminBtn"
            onClick={onAdminLogin}
            className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-white transition-all flex items-center justify-center gap-2 mx-auto mt-4"
          >
            <Lock size={12} />
            Área Administrativa
          </button>
        </motion.div>
      </div>
  </div>
);

const LoginScreen = ({ onBack }: { onBack: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isPhoneLogin, setIsPhoneLogin] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
  }, [isPhoneLogin, isRegistering, email, password, phoneNumber, verificationCode]);

  const getFriendlyErrorMessage = (err: any) => {
    const code = err.code || err.message || '';
    if (code.includes('auth/popup-closed-by-user')) {
      return 'O login foi cancelado. Por favor, tenta novamente sem fechar a janela.';
    }
    if (code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) {
      return 'Credenciais incorretas. Verifica o teu email e palavra-passe.';
    }
    if (code.includes('auth/user-not-found')) {
      return 'Utilizador não encontrado. Verifica o teu email.';
    }
    if (code.includes('auth/invalid-email')) {
      return 'O email introduzido não é válido.';
    }
    if (code.includes('auth/network-request-failed')) {
      return 'Erro de rede. Verifica a tua ligação à internet.';
    }
    if (code.includes('auth/too-many-requests')) {
      return 'Demasiadas tentativas. Tenta mais tarde.';
    }
    if (code.includes('auth/email-already-in-use')) {
      return 'Este email já está em uso por outra conta.';
    }
    if (code.includes('auth/weak-password')) {
      return 'A palavra-passe deve ter pelo menos 6 caracteres.';
    }
    return 'Ocorreu um erro no login. Tenta novamente.';
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Master Admin Config
    const ADMIN_EMAIL = "afonsomilitao85@gmail.com";
    const MASTER_KEY = "GINGA85";

    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    if (!cleanEmail.includes('@') && cleanEmail !== 'admin') {
      setError('Por favor, introduz um email válido (ex: nome@gingafutsal.com).');
      setIsLoading(false);
      return;
    }

    console.log(`Tentativa de autenticação iniciada para: ${cleanEmail}`);

    const attemptAuth = async (retryCount = 0): Promise<void> => {
      try {
        if (isRegistering) {
          console.log("Tentando registar novo utilizador...");
          await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        } else {
          try {
            // Check for Master Key Bypass (requested by user)
            if (cleanEmail === ADMIN_EMAIL && cleanPassword === MASTER_KEY) {
              console.log("Master key detetada. Iniciando fluxo de bypass de administrador...");
              // First, try to register them if they don't exist
              try {
                await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
              } catch (regErr: any) {
                // If already exists, just sign in
                if (regErr.code === 'auth/email-already-in-use') {
                  console.log("Administrador já existe, efetuando login...");
                  await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
                } else {
                  throw regErr;
                }
              }
              return;
            }

            console.log("Tentando login com credenciais...");
            await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
            console.log("Login efetuado com sucesso.");
          } catch (loginErr: any) {
            console.error("Erro no login:", loginErr.code, loginErr.message);
            // Auto-setup admin on first login attempt if they don't exist
            if ((loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential') && cleanEmail === ADMIN_EMAIL) {
              console.log("Admin não encontrado ou credenciais inválidas para o email esperado. Tentando auto-setup...");
              await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
              return;
            }
            throw loginErr;
          }
        }
      } catch (err: any) {
        console.error("Erro durante a fase de autenticação:", err);
        // If it's a network error and we haven't retried too many times, try again after a short delay
        if ((err.code === 'auth/network-request-failed' || err.message?.includes('network-error')) && retryCount < 2) {
          console.warn(`Erro de rede detetado, tentando novamente em 1.5s... (Tentativa ${retryCount + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1500));
          return attemptAuth(retryCount + 1);
        }
        setError(getFriendlyErrorMessage(err));
      }
    };

    // Use a race to avoid infinite wait if Firebase hangs
    try {
      const authPromise = attemptAuth();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 15000)
      );

      await Promise.race([authPromise, timeoutPromise]);
    } catch (err: any) {
      if (err.message === 'timeout') {
        setError('A autenticação está a demorar mais do que o esperado. Verifica a tua ligação ou tenta abrir a app noutra janela.');
      } else {
        setError(getFriendlyErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
      console.log("Fluxo de autenticação concluído.");
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!isCodeSent) {
        // Basic validation for phone number format
        if (!phoneNumber.startsWith('+')) {
          throw new Error('O número de telefone deve começar com o código do país (ex: +244).');
        }
        if (phoneNumber.length < 10) {
          throw new Error('Número de telefone inválido.');
        }

        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
        (window as any).confirmationResult = confirmation;
        setIsCodeSent(true);
      } else {
        const result = await (window as any).confirmationResult.confirm(verificationCode);
        console.log('Phone login success:', result.user);
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading) return; // Prevent multiple simultaneous calls
    
    setError('');
    setIsLoading(true);
    try {
      console.log('Iniciando Google Sign-In...');
      if (!auth) {
        throw new Error('Firebase Auth não inicializado.');
      }
      
      console.log('Chamando signInWithPopup...');
      // Direct instance creation for better argument validation
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      console.log('Google Sign-In sucesso:', result.user.email);
    } catch (err: any) {
      console.error('Google Sign-In Error Details:', err);
      
      const errorCode = err.code || '';
      const errorMessage = err.message || '';
      
      if (errorCode === 'auth/internal-error' || errorMessage.includes('auth/internal-error')) {
        setError('Erro Interno de Autenticação. Isto acontece frequentemente quando o domínio não está autorizado no Firebase ou devido a restrições do editor (iframe).');
        return;
      }
      
      // Handle "popup-closed-by-user" gracefully but provide helpful info
      if (errorCode === 'auth/popup-closed-by-user' || errorMessage.includes('auth/popup-closed-by-user')) {
        setError('O login via Google foi cancelado ou falhou devido a restrições do editor (iframe).');
        return;
      }
      
      if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('auth/unauthorized-domain')) {
        const currentDomain = window.location.hostname;
        setError(`Domínio não autorizado (${currentDomain}). Adiciona este domínio na consola do Firebase (Authentication > Settings > Authorized Domains).`);
      } else if (errorCode === 'auth/popup-blocked' || errorMessage.includes('auth/popup-blocked')) {
        setError('O popup foi bloqueado pelo navegador. Permite popups para este site ou tenta usar um navegador diferente.');
      } else if (errorCode === 'auth/argument-error') {
        setError('Erro de configuração no Firebase. Verifica as tuas chaves de API.');
      } else if (errorMessage.includes('Pending promise')) {
        setError('Uma tentativa de login já está em curso. Por favor, aguarda.');
      } else {
        setError(getFriendlyErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex justify-start mb-4">
            <button onClick={onBack} className="p-2 glass rounded-xl text-white/40 hover:text-white transition-colors">
              <ChevronRight size={20} className="rotate-180" />
            </button>
          </div>
          <div className="w-20 h-20 overflow-hidden rounded-[1.5rem] bg-white flex items-center justify-center mx-auto shadow-2xl shadow-accent/20 mb-6 border-4 border-accent/20">
            <img 
              src="/logo.png" 
              alt="GINGAFUTSAL Logo" 
              className="w-full h-full object-contain p-1 rounded-[1rem]" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://scontent.flad8-1.fna.fbcdn.net/v/t39.30808-6/679992172_122093803274358122_3249315041292680989_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=1d70fc&_nc_ohc=7rp-NwTL0k8Q7kNvwEPNlxP&_nc_oc=AdqWWxfqEPs3JFfD94Z1DKRSw-FhhXJADb3zcfXj4pMUyPkKaOZhM3-xOnj9ZrCQYYo&_nc_zt=23&_nc_ht=scontent.flad8-1.fna&_nc_gid=LKmB6mtfA7iiP9Ivm9apEg&oh=00_Af0lHEhGmWhHnwrfACyaq8ENiHtuqshEXuovRwHIqklb9g&oe=69F02CEB';
              }}
            />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter">
            ÁREA <span className="text-accent">ADMIN</span>
          </h1>
          <p className="text-white/50 font-medium text-xs uppercase tracking-widest">Acesso restrito a administradores</p>
        </div>

        <div className="glass rounded-[2.5rem] p-8 shadow-2xl border border-white/10">
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="afonso...@gmail.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-accent transition-colors"
                  autoFocus={false}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Palavra-passe</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3"
              >
                <div className="p-1 bg-red-500 rounded-full mt-0.5 shrink-0">
                  <X size={10} className="text-white" />
                </div>
                <p className="text-red-500 text-xs font-medium leading-relaxed text-left">
                  {error}
                  {(error.includes('costuma falhar') || error.includes('popup-closed-by-user') || error.includes('Interno')) && (
                    <button 
                      type="button"
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="block mt-2 bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-600 transition-colors uppercase text-[9px]"
                    >
                      Abrir App noutra janela
                    </button>
                  )}
                  {error.includes('Erro de rede') && (
                    <button 
                      type="button"
                      onClick={() => window.location.reload()}
                      className="ml-2 underline font-bold hover:text-red-600"
                    >
                      Recarregar App
                    </button>
                  )}
                </p>
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent text-white font-bold py-4 rounded-2xl shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isLoading ? 'A PROCESSAR...' : 'ENTRAR'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0A0F1C] px-4 text-white/20 font-bold">Ou continuar com</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full glass border border-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
            )}
            {isLoading ? 'A ligar...' : 'Google'}
          </button>
        </div>

        <p className="text-center text-sm text-white/40">
          {isRegistering ? 'Já tens uma conta?' : 'Ainda não tens conta?'}
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="ml-2 text-accent font-bold hover:underline"
          >
            {isRegistering ? 'Entrar' : 'Registar agora'}
          </button>
        </p>
      </div>
    </div>
  );
};

const InicioScreen = ({ setScreen, user }: { setScreen: (s: Screen) => void, user: UserProfile }) => (
  <div className="space-y-8 pb-24 px-6 pt-6">
    <header className="space-y-1">
      <p className="text-white/50 text-sm font-medium">Bem-vindo, {user.nome.split(' ')[0]}! 👋</p>
      <h2 className="text-3xl font-bold">O teu jogo começa aqui.</h2>
    </header>

    <div className="grid grid-cols-2 gap-4">
      <button 
        onClick={() => setScreen('ranking')}
        className="glass rounded-3xl p-5 space-y-3 text-left hover:bg-white/10 transition-all"
      >
        <div className="flex justify-between items-center">
          <div className="p-2 bg-accent/20 rounded-lg text-accent">
            <Trophy size={20} />
          </div>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Ranking</span>
        </div>
        <div>
          <p className="text-2xl font-bold">{user.ranking}</p>
          <p className="text-[10px] text-white/40">Top 5% em Luanda</p>
        </div>
      </button>

      <button 
        onClick={() => setScreen('convite')}
        className="glass rounded-3xl p-5 space-y-3 text-left hover:bg-white/10 transition-all"
      >
        <div className="flex justify-between items-center">
          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
            <Users size={20} />
          </div>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Convite</span>
        </div>
        <div>
          <p className="text-2xl font-bold">GANHA PRO</p>
          <p className="text-[10px] text-white/40">Traz a tua equipa</p>
        </div>
      </button>
    </div>

    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Top Jogadores</h3>
        <button onClick={() => setScreen('ranking')} className="text-accent text-xs font-bold">Ver Ranking</button>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {[
          { name: 'Mauro', likes: '2.4k', img: 'https://picsum.photos/seed/p1/100/100' },
          { name: 'Zico', likes: '2.1k', img: 'https://picsum.photos/seed/p2/100/100' },
          { name: 'Ginga', likes: '1.9k', img: 'https://picsum.photos/seed/p3/100/100' },
          { name: 'Beto', likes: '1.5k', img: 'https://picsum.photos/seed/p4/100/100' },
          { name: 'Lito', likes: '1.2k', img: 'https://picsum.photos/seed/p5/100/100' }
        ].map((player, i) => (
          <div key={i} className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-accent p-0.5">
                <img src={player.img} alt={player.name} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-accent text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-black">
                #{i + 1}
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold">{player.name}</p>
              <p className="text-[8px] text-accent font-black">{player.likes}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Ações Rápidas</h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <button 
          onClick={() => setScreen('pelada')}
          className="glass rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <PlayCircle size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold">Ver Peladas</p>
              <p className="text-xs text-white/40">Lances das últimas 24h</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-white/20 group-hover:text-accent transition-colors" />
        </button>

        <button 
          onClick={() => setScreen('competicoes')}
          className="glass rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500">
              <Trophy size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold">Competições</p>
              <p className="text-xs text-white/40">Ligas e Torneios ativos</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-white/20 group-hover:text-accent transition-colors" />
        </button>
      </div>
    </section>

    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Próximo Jogo</h3>
        <span className="text-accent text-xs font-bold">Ver Todos</span>
      </div>
      <div className="glass rounded-3xl p-6 space-y-6">
        <div className="flex justify-between items-center text-center">
          <div className="space-y-2 flex-1">
            <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center border border-white/10">
              <span className="font-bold text-xs">KIL</span>
            </div>
            <p className="font-bold text-xs">Kilamba FC</p>
          </div>
          <div className="px-4">
            <span className="text-accent font-bold text-lg">VS</span>
            <p className="text-[10px] text-white/40">32'</p>
          </div>
          <div className="space-y-2 flex-1">
            <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center border border-white/10">
              <span className="font-bold text-xs">SAM</span>
            </div>
            <p className="font-bold text-xs">Samba Futsal</p>
          </div>
        </div>
        <div className="flex justify-center">
          <span className="bg-red-600 text-[10px] font-bold px-3 py-1 rounded-full animate-pulse">AO VIVO</span>
        </div>
      </div>
    </section>
  </div>
);

const PeladaScreen = ({ onBack }: { onBack: () => void }) => {
  const [notified, setNotified] = useState(false);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center p-8 text-center bg-transparent relative overflow-hidden">
      <div className="absolute top-6 left-6 z-20">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-accent transition-all text-[10px] font-black uppercase tracking-[0.2em]">
          <ChevronLeft size={16} />
          Voltar
        </button>
      </div>
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/10 blur-[100px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="relative"
      >
        <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center relative z-10">
          <PlayCircle size={48} className="text-accent" />
        </div>
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-accent/30 rounded-full blur-xl"
        />
      </motion.div>

      <div className="space-y-4 relative z-10">
        <h2 className="text-3xl font-black italic tracking-tighter text-white">
          🚧 Em <span className="text-accent">desenvolvimento</span>
        </h2>
        <p className="text-white/60 font-medium text-sm leading-relaxed max-w-[260px] mx-auto">
          Prepara as tuas sapatilhas! Em breve vais poder publicar os teus melhores lances e dribles.
        </p>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full relative z-10"
      >
        {!notified ? (
          <button 
            onClick={() => setNotified(true)}
            className="w-full max-w-[240px] bg-accent text-white font-bold py-4 rounded-2xl shadow-lg shadow-accent/20 hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center justify-center gap-3 mx-auto"
          >
            Quero ser notificado
          </button>
        ) : (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-green-500/10 border border-green-500/20 py-4 px-6 rounded-2xl text-green-500 font-bold flex items-center justify-center gap-3 mx-auto max-w-[240px]"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Serás avisado em breve
          </motion.div>
        )}
      </motion.div>

      <div className="grid grid-cols-3 gap-4 opacity-20 filter grayscale">
        {[1,2,3].map(i => (
          <div key={i} className="w-16 h-16 bg-white/10 rounded-xl" />
        ))}
      </div>
    </div>
  );
};

const LiveScreen = ({ games, onBack }: { games: Match[], onBack: () => void }) => {
  const liveGames = games
    .filter(g => g.status?.toLowerCase() === 'ao_vivo' || g.status?.toLowerCase() === 'ao vivo')
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const finishedGames = games
    .filter(g => g.status?.toLowerCase() === 'finalizado')
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-24">
      <div className="px-6 pt-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-accent transition-all text-[10px] font-black uppercase tracking-[0.2em] mb-4">
          <ChevronLeft size={16} />
          Voltar
        </button>
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Ginga <span className="text-accent underline">Live</span></h2>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Acompanha as emoções em tempo real</p>
          </div>
          <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 text-[8px] font-black uppercase">{liveGames.length} Directos</span>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-6">
        {/* Live Games Section */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-white/30 tracking-widest px-1">Jogos a Decorrer</h3>
          {liveGames.length === 0 ? (
            <div className="text-center py-20 space-y-4 glass rounded-[2.5rem] border border-white/5">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
                <Video size={40} className="opacity-20" />
              </div>
              <p className="text-white/20 font-bold uppercase text-[10px] tracking-widest">Sem jogos ao vivo no momento</p>
            </div>
          ) : (
            liveGames.map(game => (
              <div key={game.id} className="glass rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden group border border-white/5 shadow-2xl">
                {/* Status Indicator */}
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full shadow-lg shadow-red-600/20 animate-pulse w-fit">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">AO VIVO</span>
                    </div>
                    {game.hora && <span className="text-[10px] font-black text-accent ml-2 italic">🕒 {game.hora}</span>}
                  </div>
                  <div className="text-right">
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{game.liga || 'Ginga Cup'}</p>
                    <p className="text-accent text-[8px] font-black uppercase tracking-widest mt-1">Jornada {game.jornada || 1}</p>
                  </div>
                </div>

                {/* Scoreboard */}
                <div className="flex justify-between items-center relative z-10 gap-4">
                  <div className="text-center space-y-3 flex-1 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-[2rem] glass p-4 flex items-center justify-center border border-white/10 shadow-xl group-hover:scale-110 transition-transform">
                      <span className="font-black italic text-2xl text-accent">{(game.equipaA || '').substring(0, 3).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-black italic text-sm uppercase leading-tight">{game.equipaA}</p>
                      <p className="text-[8px] font-bold text-white/20 uppercase mt-1">Equipa A</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="text-5xl font-black italic tracking-tighter flex items-center gap-4">
                      <span>{game.golosA}</span>
                      <span className="text-accent opacity-50">-</span>
                      <span>{game.golosB}</span>
                    </div>
                    <div className="px-4 py-1.5 glass rounded-full border border-white/10 mt-2">
                       <span className="text-[10px] font-black text-accent italic">{game.tempo || "00'"}</span>
                    </div>
                  </div>

                  <div className="text-center space-y-3 flex-1 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-[2rem] glass p-4 flex items-center justify-center border border-white/10 shadow-xl group-hover:scale-110 transition-transform">
                      <span className="font-black italic text-2xl text-accent">{(game.equipaB || '').substring(0, 3).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-black italic text-sm uppercase leading-tight">{game.equipaB}</p>
                      <p className="text-[8px] font-bold text-white/20 uppercase mt-1">Equipa B</p>
                    </div>
                  </div>
                </div>

                {game.local && (
                  <div className="flex items-center justify-center gap-2 opacity-50 relative z-10 bg-white/5 py-2 rounded-xl">
                    <MapPin size={10} className="text-accent" />
                    <span className="text-[9px] font-black uppercase tracking-widest italic">{game.local}</span>
                  </div>
                )}

                {/* Watch Button */}
                <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 relative z-10">
                  <PlayCircle size={18} className="text-accent" />
                  Assistir Transmissão
                </button>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 blur-[100px] rounded-full -ml-32 -mb-32" />
              </div>
            ))
          )}
        </div>

        {/* Finished Games Section */}
        {finishedGames.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-white/30 tracking-widest px-1">Resultados Recentes</h3>
            <div className="grid grid-cols-1 gap-3">
              {finishedGames.map(game => (
                <div key={game.id} className="glass p-5 rounded-3xl flex items-center justify-between border border-white/5 opacity-80 hover:opacity-100 transition-all">
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-[10px] font-black italic text-white/80 w-16 truncate">{game.equipaA}</span>
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-xl">
                      <span className="font-black text-xs">{game.golosA}</span>
                      <span className="text-[8px] text-white/20">-</span>
                      <span className="font-black text-xs">{game.golosB}</span>
                    </div>
                    <span className="text-[10px] font-black italic text-white/80 w-16 truncate text-right">{game.equipaB}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4 border-l border-white/10 ml-4">
                    <span className="text-[8px] font-bold text-white/20 uppercase">FIM</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CompeticoesScreen = ({ leagues, teams, participations, players, matches, onBack }: { 
  leagues: League[], 
  teams: Team[], 
  participations: Participation[],
  players: LeaguePlayer[],
  matches: Match[],
  onBack: () => void
}) => {
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [activeTab, setActiveTab] = useState<'tabela' | 'jogos' | 'equipas'>('tabela');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedJornada, setSelectedJornada] = useState<number | 'todas'>('todas');
  const [selectedGroup, setSelectedGroup] = useState<string | 'todos'>('todos');

  const getLeagueTeams = (leagueId: string, group: string | 'todos' = 'todos') => {
    // 1. Tentar obter pelo novo modelo (participations)
    const leaguePartics = participations.filter(p => p.competicaoId === leagueId);
    
    let filteredTeams: Team[] = [];
    
    if (leaguePartics.length > 0) {
      filteredTeams = teams.filter(t => leaguePartics.some(p => p.equipaId === t.id))
        .map(t => {
          const p = leaguePartics.find(part => part.equipaId === t.id);
          return { ...t, grupo: p?.grupo || null };
        });
    } else {
      // 2. Modelo antigo (fallback)
      filteredTeams = teams.filter(t => t.ligaId === leagueId);
    }

    if (group !== 'todos') {
      return filteredTeams.filter(t => t.grupo === group);
    }
    return filteredTeams;
  };

  const calculateStandings = (leagueId: string, group: string | null = null) => {
    const standings = getLeagueTeams(leagueId, group || 'todos').map(team => ({
      ...team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    }));

    const leagueMatches = matches.filter(m => 
      m.ligaId === leagueId && 
      (group ? m.grupo === group : true) &&
      (m.status?.toLowerCase() === 'finalizado')
    );

    leagueMatches.forEach(match => {
      const teamA = standings.find(t => t.id === match.equipaAId);
      const teamB = standings.find(t => t.id === match.equipaBId);

      if (teamA && teamB) {
        teamA.played++;
        teamB.played++;
        teamA.goalsFor += (match.golosA || 0);
        teamA.goalsAgainst += (match.golosB || 0);
        teamB.goalsFor += (match.golosB || 0);
        teamB.goalsAgainst += (match.golosA || 0);

        if (match.golosA > match.golosB) {
          teamA.won++;
          teamA.points += 3;
          teamB.lost++;
        } else if (match.golosA < match.golosB) {
          teamB.won++;
          teamB.points += 3;
          teamA.lost++;
        } else {
          teamA.drawn++;
          teamB.drawn++;
          teamA.points += 1;
          teamB.points += 1;
        }
      }
    });

    standings.forEach(t => {
      // Aplicar Ajustes Manuais
      const adjPoints = t.ajustePontos || 0;
      const adjGM = t.ajusteGM || 0;
      const adjGS = t.ajusteGS || 0;

      t.points += adjPoints;
      t.goalsFor += adjGM;
      t.goalsAgainst += adjGS;
      t.goalDifference = t.goalsFor - t.goalsAgainst;
    });

    // Ordenação Profissional: Pontos > DG > GM
    return standings.sort((a, b) => 
      b.points - a.points || 
      b.goalDifference - a.goalDifference || 
      b.goalsFor - a.goalsFor
    );
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr || dateStr === 'Sem Data' || typeof dateStr !== 'string') return 'Data a definir';
    try {
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const [year, month, day] = dateStr.split('-');
      if (!year || !month || !day) return dateStr;
      return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const currentLeagueTeams = selectedLeague ? getLeagueTeams(selectedLeague.id) : [];
  const teamPlayers = players.filter(p => p.equipaId === selectedTeam?.id);
  const standings = selectedLeague ? calculateStandings(selectedLeague.id) : [];
  const leagueMatches = matches
    .filter(m => m.ligaId === selectedLeague?.id)
    .sort((a, b) => {
      if (a.timestamp && b.timestamp) return a.timestamp - b.timestamp;
      if (a.timestamp) return -1;
      if (b.timestamp) return 1;
      
      const valA = typeof a.data === 'number' ? a.data : 0;
      const valB = typeof b.data === 'number' ? b.data : 0;
      return valB - valA;
    });

  if (selectedTeam) {
    const teamStats = standings.find(t => t.id === selectedTeam.id);
    const lastMatches = matches
      .filter(m => 
        (m.equipaAId === selectedTeam.id || m.equipaBId === selectedTeam.id) && 
        (m.status?.toLowerCase() === 'finalizado' || m.status === 'FINALIZADO')
      )
      .sort((a,b) => b.data - a.data)
      .slice(0, 5);

    return (
      <div className="px-6 py-8 space-y-8 pb-32">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedTeam(null)} className="p-2 glass rounded-xl text-white/40 shadow-lg">
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden glass p-1 border border-white/10">
                <img src={selectedTeam.logo || `https://picsum.photos/seed/${selectedTeam.nome}/100/100`} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight italic">{selectedTeam.nome}</h2>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Team Info Banner */}
          <div className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{selectedTeam.cidade || 'LUANDA, ANGOLA'}</span>
            </div>
            {selectedTeam.descricao && (
              <p className="text-xs text-white/60 leading-relaxed font-medium italic">"{selectedTeam.descricao}"</p>
            )}
            
            {/* Form / Last Games */}
            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Forma Recente</p>
              <div className="flex gap-2">
                {lastMatches.map(m => {
                  const isEquipaA = m.equipaAId === selectedTeam.id;
                  const win = isEquipaA ? m.golosA > m.golosB : m.golosB > m.golosA;
                  const draw = m.golosA === m.golosB;
                  return (
                    <div 
                      key={m.id} 
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-lg ${win ? 'bg-green-500 text-white' : draw ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}
                      title={`${m.equipaA} ${m.golosA} - ${m.golosB} ${m.equipaB}`}
                    >
                      {win ? 'V' : draw ? 'E' : 'D'}
                    </div>
                  );
                })}
                {lastMatches.length === 0 && <p className="text-[10px] font-bold text-white/20 italic">Sem histórico disponível</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black uppercase text-accent tracking-[0.2em]">Plantel Oficial</h3>
            <span className="text-[10px] font-bold text-white/40">{teamPlayers.length} ATLETAS</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {teamPlayers.sort((a,b) => (a.numero || 0) - (b.numero || 0)).map(player => (
              <div key={player.id} className="glass p-5 rounded-3xl flex items-center justify-between border border-white/5 group hover:border-accent/30 transition-all shadow-xl overflow-hidden relative">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-accent/20 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg shadow-accent/10 border border-accent/20 relative group-hover:scale-110 transition-transform">
                    {player.foto ? (
                      <img src={player.foto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-accent font-black italic text-xl">{player.numero || '??'}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-base">{player.nome}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">{player.posicao} {player.foto ? `• #${player.numero}` : ''}</p>
                      {(player.golos || 0) > 0 && (
                        <div className="flex items-center gap-1 bg-accent/10 px-2 py-0.5 rounded-full">
                          <Trophy size={8} className="text-accent" />
                          <span className="text-[8px] font-black text-accent">{player.golos}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/60">{player.golos || 0} G</p>
                    <p className="text-[8px] font-bold text-white/20">{player.assistencias || 0} A</p>
                  </div>
                </div>
                
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full -mr-12 -mt-12" />
              </div>
            ))}
            {teamPlayers.length === 0 && (
              <div className="text-center py-20 text-white/20 glass rounded-[2.5rem]">
                <User size={40} className="mx-auto opacity-20 mb-3" />
                <p className="text-xs font-bold uppercase">Nenhum atleta inscrito</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedLeague) {
    return (
      <div className="px-6 py-8 space-y-6 pb-32">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedLeague(null)} className="p-2 glass rounded-xl text-white/40 shadow-lg">
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden glass p-1 border border-white/10">
              <img src={selectedLeague.logo || `https://picsum.photos/seed/${selectedLeague.nome}/100/100`} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight leading-none italic">{selectedLeague.nome}</h2>
              <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">{selectedLeague.temporada || 'TEMPORADA 2024'}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-1 glass rounded-2xl border border-white/5 shadow-inner">
          {(['tabela', 'jogos', 'equipas'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-accent text-white shadow-lg' : 'text-white/40'}`}
            >
              {tab === 'tabela' ? 'Tabela' : tab === 'jogos' ? 'Jogos' : 'Equipas'}
            </button>
          ))}
        </div>

        {selectedLeague.modoCompeticao === 'grupos' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
            <button 
              onClick={() => setSelectedGroup('todos')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedGroup === 'todos' ? 'bg-accent/20 text-accent border border-accent/30' : 'glass text-white/40 border border-white/5'}`}
            >
              Todos Grupos
            </button>
            {Array.from(new Set([
              ...teams.filter(t => t.ligaId === selectedLeague?.id).map(t => t.grupo),
              ...matches.filter(m => m.ligaId === selectedLeague?.id).map(m => m.grupo)
            ])).filter(g => g).sort().map(g => (
              <button 
                key={g}
                onClick={() => setSelectedGroup(g!)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedGroup === g ? 'bg-accent/20 text-accent border border-accent/30' : 'glass text-white/40 border border-white/5'}`}
              >
                Grupo {g}
              </button>
            ))}
          </div>
        )}

        <div className="pt-2">
          {activeTab === 'tabela' && (
            <div className="space-y-8">
              {(selectedGroup === 'todos' ? Array.from(new Set(teams.filter(t => t.ligaId === selectedLeague.id).map(t => t.grupo || 'Sem Grupo'))).sort() : [selectedGroup]).map(groupName => {
                const groupStandings = calculateStandings(selectedLeague.id, groupName === 'Sem Grupo' ? null : groupName);
                if (groupStandings.length === 0 && selectedGroup !== 'todos') return null;
                if (groupStandings.length === 0 && selectedGroup === 'todos') return null;

                return (
                  <div key={groupName} className="space-y-4">
                    {selectedLeague.modoCompeticao === 'grupos' && (
                      <div className="flex items-center gap-3 px-2">
                        <Trophy size={14} className="text-accent" />
                        <h3 className="text-xs font-black uppercase text-accent tracking-[0.2em] italic">🏆 GRUPO {groupName}</h3>
                      </div>
                    )}
                    
                    <div className="glass rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl">
                      <div className="overflow-x-auto no-scrollbar">
                        <div className="min-w-[400px]">
                          <div className="grid grid-cols-[2.5rem_1fr_2rem_1.5rem_1.5rem_1.5rem_1.5rem_1.5rem_2rem_2rem] gap-1 p-4 bg-white/5 text-[8px] font-black text-white/40 uppercase tracking-widest text-center items-center">
                            <span className="text-left pl-1">#</span>
                            <span className="text-left">EQUIPA</span>
                            <span className="text-white font-bold">PTS</span>
                            <span>J</span>
                            <span>V</span>
                            <span>E</span>
                            <span>D</span>
                            <span>GM</span>
                            <span>GS</span>
                            <span>SG</span>
                          </div>
                          <div className="divide-y divide-white/5">
                            {groupStandings.map((team, idx) => {
                              const isLeader = idx === 0;
                              const isLast = idx === groupStandings.length - 1 && groupStandings.length > 1;
                              return (
                                <div 
                                  key={team.id} 
                                  className={`grid grid-cols-[2.5rem_1fr_2rem_1.5rem_1.5rem_1.5rem_1.5rem_1.5rem_2rem_2rem] gap-1 p-4 items-center text-center group hover:bg-white/5 transition-colors cursor-pointer ${isLeader ? 'bg-green-500/5' : isLast ? 'bg-red-500/5' : ''}`}
                                  onClick={() => setSelectedTeam(team)}
                                >
                                  <span className={`font-black italic text-xs ${isLeader ? 'text-green-500' : isLast ? 'text-red-500' : idx < 4 ? 'text-accent' : 'text-white/40'}`}>
                                    {idx + 1}
                                  </span>
                                  <div className="flex items-center gap-2 text-left min-w-0">
                                    <img src={team.logo || `https://picsum.photos/seed/${team.nome}/40/40`} className="w-5 h-5 rounded-md object-contain shrink-0" referrerPolicy="no-referrer" />
                                    <span className="font-bold text-[11px] truncate">{team.nome}</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs font-black italic text-accent">{team.points}</span>
                                    {team.ajustePontos !== 0 && (
                                      <span className={`text-[8px] font-bold ${team.ajustePontos > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {team.ajustePontos > 0 ? `+${team.ajustePontos}` : team.ajustePontos}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-medium text-white/60">{team.played}</span>
                                  <span className="text-[10px] font-medium text-white/60">{team.won}</span>
                                  <span className="text-[10px] font-medium text-white/60">{team.drawn}</span>
                                  <span className="text-[10px] font-medium text-white/60">{team.lost}</span>
                                  <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-medium text-white/60">{team.goalsFor}</span>
                                    {team.ajusteGM !== 0 && (
                                      <span className="text-[7px] font-bold text-green-500/60 leading-none">+{team.ajusteGM}</span>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-medium text-white/60">{team.goalsAgainst}</span>
                                    {team.ajusteGS !== 0 && (
                                      <span className="text-[7px] font-bold text-red-500/60 leading-none">+{team.ajusteGS}</span>
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-bold ${team.goalDifference > 0 ? 'text-green-500' : team.goalDifference < 0 ? 'text-red-500' : 'text-white/40'}`}>
                                    {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                                  </span>
                                </div>
                              );
                            })}
                            {groupStandings.length === 0 && (
                              <p className="text-center py-10 text-white/20 text-xs font-bold font-black uppercase italic">Nenhuma equipa registada neste grupo</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-white/5 flex justify-center border-t border-white/5">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Clica numa equipa para ver o plantel</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {selectedLeague.modoCompeticao === 'liga' && standings.length === 0 && (
                <div className="glass p-12 text-center rounded-[2.5rem]">
                  <Trophy size={40} className="mx-auto text-white/5 mb-4" />
                  <p className="text-xs font-black uppercase text-white/20">Nenhuma equipa inscrita nesta liga</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'jogos' && (
            <div className="space-y-8">
              {/* Jornada Filter */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
                <button 
                  onClick={() => setSelectedJornada('todas')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedJornada === 'todas' ? 'bg-accent text-white' : 'glass text-white/40 border border-white/5'}`}
                >
                  Todas
                </button>
                {Array.from(new Set(leagueMatches.map(m => m.jornada || 1))).sort((a,b) => a-b).map(j => (
                  <button 
                    key={j}
                    onClick={() => setSelectedJornada(j)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedJornada === j ? 'bg-accent text-white' : 'glass text-white/40 border border-white/5'}`}
                  >
                    J{j}
                  </button>
                ))}
              </div>

               {leagueMatches.length === 0 ? (
                <div className="text-center py-20 text-white/20 glass rounded-[2rem] border border-white/5">
                  <Calendar size={40} className="mx-auto opacity-10 mb-3" />
                  <p className="text-sm font-bold uppercase tracking-widest">Sem jogos agendados</p>
                </div>
              ) : (
                Object.entries(
                  leagueMatches
                    .filter(m => selectedJornada === 'todas' || (m.jornada || 1) === selectedJornada)
                    .filter(m => selectedGroup === 'todos' || m.grupo === selectedGroup)
                    .reduce((acc, match) => {
                      const j = match.jornada || 1;
                      if (!acc[j]) acc[j] = [];
                      acc[j].push(match);
                      return acc;
                    }, {} as Record<number, Match[]>)
                )
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([jornada, jornadaMatches]) => (
                  <div key={jornada} className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <div className="h-[1px] flex-1 bg-white/10" />
                       <h3 className="text-[10px] font-black uppercase text-accent tracking-[0.3em]">Jornada {jornada}</h3>
                       <div className="h-[1px] flex-1 bg-white/10" />
                    </div>

                    {Object.entries(
                      jornadaMatches.reduce((acc, m) => {
                        const subgroupKey = selectedLeague.modoCompeticao === 'grupos' ? `Grupo ${m.grupo || '?'}` : (m.data || 'Sem Data');
                        if (!acc[subgroupKey]) acc[subgroupKey] = [];
                        acc[subgroupKey].push(m);
                        return acc;
                      }, {} as Record<string, Match[]>)
                    ).map(([subgroup, subMatches]) => (
                      <div key={subgroup} className="space-y-4">
                        {/* Subgroup Label (Date or Group) */}
                        <div className="flex items-center gap-2 pl-4">
                          {subgroup.startsWith('Grupo') ? <Trophy size={12} className="text-accent" /> : <Calendar size={12} className="text-accent" />}
                          <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                            {subgroup.startsWith('Grupo') ? subgroup : formatDateLabel(subgroup)}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {subMatches.map(match => {
                            const status = match.status?.toLowerCase() || 'finalizado';
                            const isLive = status === 'ao_vivo' || status === 'ao vivo';
                            const isScheduled = status === 'agendado';

                            return (
                              <div key={match.id} className={`glass p-6 rounded-[2.5rem] space-y-4 border relative overflow-hidden group shadow-xl transition-all ${isLive ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'}`}>
                                {/* Live Badge Background */}
                                {isLive && (
                                  <div className="absolute top-0 right-0 p-1 opacity-20">
                                    <div className="bg-red-500 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16" />
                                  </div>
                                )}

                                <div className="flex justify-between items-center relative z-10">
                                  <div className="flex items-center gap-3">
                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isLive ? 'bg-red-500 text-white animate-pulse' : isScheduled ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/10 text-white/40'}`}>
                                      <span>{isLive ? '🔴 AO VIVO' : isScheduled ? '🟡 AGENDADO' : '⚫ FINAL'}</span>
                                    </div>
                                    {match.hora && (
                                      <div className="flex items-center gap-1">
                                        <Zap size={10} className="text-accent fill-accent" />
                                        <span className="text-[11px] font-black text-accent">{match.hora}</span>
                                      </div>
                                    )}
                                    {isLive && <span className="text-[9px] font-black text-red-500 animate-pulse">{match.tempo}</span>}
                                  </div>
                                  <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{match.liga}</span>
                                </div>
                                
                                <div className="flex justify-between items-center gap-4 text-center">
                                  <div className="flex-1 space-y-2">
                                    <div className="w-12 h-12 glass rounded-2xl mx-auto p-2 border border-white/10 shadow-lg group-hover:scale-110 transition-transform">
                                      <img src={teams.find(t => t.id === match.equipaAId)?.logo || `https://picsum.photos/seed/${match.equipaA}/100/100`} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                    </div>
                                    <p className="font-black italic text-[10px] uppercase truncate">{match.equipaA}</p>
                                  </div>
                                  
                                  <div className="flex items-center gap-3 px-5 py-4 bg-white/5 rounded-[1.5rem] border border-white/10 shadow-inner min-w-[100px] justify-center">
                                    {isScheduled && (!match.golosA && !match.golosB || (match.golosA === 0 && match.golosB === 0)) ? (
                                      <span className="text-sm font-black italic text-accent tracking-tighter uppercase whitespace-nowrap">
                                        {match.hora || "VS"}
                                      </span>
                                    ) : (
                                      <>
                                        <span className={`text-3xl font-black italic leading-none ${isLive ? 'text-white' : 'text-white/80'}`}>{match.golosA ?? 0}</span>
                                        <span className="text-white/10 font-black text-xl">-</span>
                                        <span className={`text-3xl font-black italic leading-none ${isLive ? 'text-white' : 'text-white/80'}`}>{match.golosB ?? 0}</span>
                                      </>
                                    )}
                                  </div>
                                  
                                  <div className="flex-1 space-y-2">
                                    <div className="w-12 h-12 glass rounded-2xl mx-auto p-2 border border-white/10 shadow-lg group-hover:scale-110 transition-transform">
                                      <img src={teams.find(t => t.id === match.equipaBId)?.logo || `https://picsum.photos/seed/${match.equipaB}/100/100`} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                    </div>
                                    <p className="font-black italic text-[10px] uppercase truncate">{match.equipaB}</p>
                                  </div>
                                </div>

                                {match.local && (
                                  <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/5 opacity-60">
                                    <MapPin size={10} className="text-accent" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{match.local}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'equipas' && (
            <div className="grid grid-cols-2 gap-4">
              {currentLeagueTeams.map(team => (
                <button 
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className="glass p-6 rounded-[2.5rem] flex flex-col items-center gap-4 border border-white/5 group hover:border-accent/40 hover:bg-accent/5 transition-all text-center shadow-lg"
                >
                  <div className="w-20 h-20 rounded-[2rem] overflow-hidden glass p-3 shadow-xl group-hover:scale-105 transition-transform border border-white/10">
                    <img src={team.logo || `https://picsum.photos/seed/${team.nome}/200/200`} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <p className="font-black italic text-sm uppercase leading-tight">{team.nome}</p>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">Ver Plantel</p>
                  </div>
                </button>
              ))}
              {currentLeagueTeams.length === 0 && (
                <div className="col-span-2 text-center py-20 text-white/20 glass rounded-[2.5rem] border border-white/5">
                  <Users size={40} className="mx-auto opacity-10 mb-3" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhuma equipa</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-8 pb-32">
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-accent transition-all text-[10px] font-black uppercase tracking-[0.2em]">
          <ChevronLeft size={16} />
          Voltar
        </button>
        <div className="space-y-2">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Copas <span className="text-accent underline decoration-4 underline-offset-4">&</span> Torneios</h2>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">O Futsal de Elite em Angola</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {leagues.length === 0 ? (
          <div className="text-center py-20 space-y-4 glass rounded-[3rem] border border-white/5 shadow-2xl">
            <Trophy size={60} className="mx-auto opacity-10" />
            <p className="text-white/40 font-bold uppercase text-xs tracking-widest italic">A aguardar início da temporada</p>
          </div>
        ) : (
          leagues.map(league => (
            <motion.button 
              key={league.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedLeague(league)}
              className="glass p-6 rounded-[2.5rem] flex items-center gap-6 border-l-4 border-l-accent border border-white/5 group transition-all shadow-xl hover:shadow-accent/5"
            >
              <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden glass p-2 shadow-2xl border border-white/10">
                <img src={league.logo || `https://picsum.photos/seed/${league.nome}/150/150`} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                   <h3 className="font-black italic text-lg uppercase leading-none truncate pr-2">{league.nome}</h3>
                   <span className="bg-accent/20 text-accent text-[8px] font-black px-2 py-1 rounded-md uppercase whitespace-nowrap">{league.temporada || '2024'}</span>
                </div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{league.regiao}</p>
                <div className="flex items-center gap-4 mt-3">
                   <div className="flex items-center gap-1.5 opacity-60">
                     <Users size={12} className="text-accent" />
                     <span className="text-[10px] font-bold">{teams.filter(t => t.ligaId === league.id).length} EQ.</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <Zap size={12} className="text-red-500" />
                     <span className="text-[10px] font-bold text-white/80">{matches.filter(m => m.ligaId === league.id && m.status === 'AO VIVO').length} AO VIVO</span>
                   </div>
                </div>
              </div>
              <ChevronRight size={20} className="text-white/20 group-hover:text-accent transition-colors" />
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
};

const MercadoScreen = ({ products, onAddProduct, user, onBack }: { products: Product[], onAddProduct: (p: Partial<Product>) => void, user: UserProfile, onBack: () => void }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAd, setNewAd] = useState({ title: '', price: '', whatsapp: '', isFeatured: false });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleWhatsApp = (number: string, title: string) => {
    const message = encodeURIComponent(`Olá, tenho interesse no produto: ${title} que vi no GingaFutsal!`);
    window.open(`https://wa.me/${number}?text=${message}`, '_blank');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("A imagem é muito grande. Máximo 5MB.");
        return;
      }
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setIsUploadComplete(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAd.title || !newAd.price || !newAd.whatsapp) return;

    let imageUrl = 'product' + Math.floor(Math.random() * 100);

    if (mediaFile) {
      setIsUploading(true);
      setUploadProgress(0);
      setIsUploadComplete(false);

      try {
        const timestamp = Date.now();
        const sanitizedName = mediaFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const storagePath = `ads/${timestamp}_${sanitizedName}`;
        console.log('Starting upload to Mercado:', storagePath);
        console.log('File details:', { name: mediaFile.name, size: mediaFile.size, type: mediaFile.type });
        const storageRef = ref(storage, storagePath);
        console.log("Upload iniciado para Mercado");
        const uploadWithRetry = (retries = 2): Promise<boolean> => {
          return new Promise((resolve, reject) => {
            console.log(`Upload attempt (Mercado). Retries left: ${retries}`);
            const uploadTask = uploadBytesResumable(storageRef, mediaFile);

            uploadTask.on('state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload progress (Mercado): ${progress}%`, snapshot.state);
                setUploadProgress(progress);
              },
              async (error) => {
                console.error("Upload error:", error);
                if (retries > 0 && (error.code === 'storage/retry-limit-exceeded' || error.code === 'storage/unknown')) {
                  console.log("Retrying upload...");
                  resolve(uploadWithRetry(retries - 1));
                } else {
                  reject(error);
                }
              },
              async () => {
                try {
                  imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                  setIsUploadComplete(true);
                  setUploadProgress(100);
                  resolve(true);
                } catch (err) {
                  reject(err);
                }
              }
            );
          });
        };

        await uploadWithRetry();
      } catch (error: any) {
        console.error("Upload error:", error);
        setIsUploading(false);
        
        let message = "Erro ao carregar imagem. Tenta novamente.";
        if (error.code === 'storage/retry-limit-exceeded') {
          message = "A ligação falhou repetidamente. Verifica a tua internet ou tenta um ficheiro mais pequeno.";
        } else if (error.code === 'storage/unauthorized') {
          message = "Sem permissão para carregar a imagem.";
        }
        alert(message);
        return;
      }
    }

    onAddProduct({
      title: newAd.title,
      price: newAd.price,
      whatsapp: newAd.whatsapp,
      isFeatured: newAd.isFeatured,
      img: imageUrl
    });

    if (isUploading) {
      setTimeout(() => {
        setNewAd({ title: '', price: '', whatsapp: '', isFeatured: false });
        setMediaFile(null);
        setMediaPreview(null);
        setIsUploading(false);
        setIsModalOpen(false);
        setIsUploadComplete(false);
        setUploadProgress(0);
      }, 1000);
    } else {
      setNewAd({ title: '', price: '', whatsapp: '', isFeatured: false });
      setMediaFile(null);
      setMediaPreview(null);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="px-6 py-6 space-y-6 pb-24 relative">
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-accent transition-all text-[10px] font-black uppercase tracking-[0.2em]">
          <ChevronLeft size={16} />
          Voltar
        </button>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Mercado</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-accent text-white font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={20} />
            Vender
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {products.length === 0 ? (
          <div className="text-center py-20 space-y-4 glass rounded-[2.5rem]">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
              <ShoppingBag size={40} />
            </div>
            <p className="text-white/40 font-bold">Nenhum produto à venda</p>
          </div>
        ) : (
          products.map(item => (
            <div key={item.id} className={`glass rounded-[2.5rem] p-4 flex flex-col gap-4 relative overflow-hidden ${item.isFeatured ? 'border-2 border-accent/50 shadow-xl shadow-accent/10' : 'border border-white/5'}`}>
              {item.isFeatured && (
                <div className="absolute top-6 right-6 z-10 bg-accent text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                  <Star size={10} className="fill-white" /> DESTAQUE
                </div>
              )}
              <div className="aspect-[16/9] rounded-[2rem] overflow-hidden bg-white/5">
                <img 
                  src={item.img.startsWith('http') ? item.img : `https://picsum.photos/seed/${item.img}/800/450`} 
                  alt={item.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="px-2 pb-2 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-lg leading-tight flex-1">{item.title}</h4>
                  <span className="text-accent font-black italic text-xl">{item.price}</span>
                </div>
                <button 
                  onClick={() => handleWhatsApp(item.whatsapp, item.title)}
                  className="w-full bg-[#25D366] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                >
                  <span className="text-lg">👉</span> Contactar via WhatsApp
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Ad Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md glass rounded-[2.5rem] p-8 space-y-6 relative border border-white/10"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Criar Anúncio</h3>
                <p className="text-white/50 text-sm">Vende os teus artigos desportivos.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Foto do Produto</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/10 transition-all overflow-hidden relative"
                  >
                    {mediaPreview ? (
                      <img 
                        src={mediaPreview} 
                        className="w-full h-full object-cover"
                        alt="Preview"
                      />
                    ) : (
                      <>
                        <ImageIcon size={32} className="text-white/20" />
                        <span className="text-xs font-bold text-white/40">Adicionar Foto</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Título do Produto</label>
                  <input 
                    type="text" 
                    required
                    value={newAd.title}
                    onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                    placeholder="Ex: Chuteiras Nike Mercurial"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-accent transition-colors"
                    autoFocus={false}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Preço</label>
                    <input 
                      type="text" 
                      required
                      value={newAd.price}
                      onChange={(e) => setNewAd({...newAd, price: e.target.value})}
                      placeholder="Ex: 25.000 Kz"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-accent transition-colors"
                      autoFocus={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">WhatsApp</label>
                    <input 
                      type="tel" 
                      required
                      value={newAd.whatsapp}
                      onChange={(e) => setNewAd({...newAd, whatsapp: e.target.value})}
                      placeholder="Ex: 2449..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-accent transition-colors"
                      autoFocus={false}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="button"
                    onClick={() => setNewAd({...newAd, isFeatured: !newAd.isFeatured})}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${newAd.isFeatured ? 'bg-accent/20 border-accent text-accent' : 'bg-white/5 border-white/10 text-white/40'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Star size={20} className={newAd.isFeatured ? 'fill-accent' : ''} />
                      <div className="text-left">
                        <p className="text-xs font-bold">Destacar Anúncio</p>
                        <p className="text-[10px] opacity-70">Aparece no topo com selo PRO</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${newAd.isFeatured ? 'border-accent bg-accent' : 'border-white/20'}`}>
                      {newAd.isFeatured && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </button>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${isUploadComplete ? 'bg-green-500' : 'bg-accent'}`} 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isUploadComplete ? 'text-green-500' : 'text-accent'}`}>
                        {isUploadComplete ? 'Upload concluído' : `A enviar... ${Math.round(uploadProgress)}%`}
                      </p>
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-accent text-white font-bold py-4 rounded-2xl shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 disabled:opacity-50"
                >
                  {isUploading ? 'A PUBLICAR...' : 'PUBLICAR ANÚNCIO'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PerfilScreen = ({ user, currentUser, onLogout, onUpgrade, onAdminClick, onAboutClick, onBack }: { 
  user: UserProfile, 
  currentUser: UserProfile | null, 
  onLogout: () => void, 
  onUpgrade: () => void, 
  onAdminClick: () => void,
  onAboutClick: () => void,
  onBack: () => void
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nome, setNome] = useState(user.nome);
  const [bairro, setBairro] = useState(user.bairro || '');
  const [bio, setBio] = useState(user.bio || '');
  const [localizacao, setLocalizacao] = useState(user.localizacao || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNome(user.nome);
    setBairro(user.bairro || '');
    setBio(user.bio || '');
    setLocalizacao(user.localizacao || '');
  }, [user]);

  const handleSave = async () => {
    if (!nome.trim()) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        nome: nome.trim(),
        bairro: bairro.trim(),
        bio: bio.trim(),
        localizacao: localizacao.trim()
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter menos de 5MB");
      return;
    }

    setIsUpdating(true);
    setUploadProgress(0);
    console.log('Starting upload for Profile Avatar');
    console.log('File details:', { name: file.name, size: file.size, type: file.type });
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      console.log("Upload iniciado para Perfil");
      const uploadWithRetry = (retries = 2): Promise<void> => {
        return new Promise((resolve, reject) => {
          console.log(`Upload attempt (Perfil). Retries left: ${retries}`);
          const uploadTask = uploadBytesResumable(storageRef, file);

          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Upload progress (Perfil): ${progress}%`, snapshot.state);
              setUploadProgress(progress);
            },
            async (error: any) => {
              console.error("Upload error:", error);
              if (retries > 0 && (error.code === 'storage/retry-limit-exceeded' || error.code === 'storage/unknown')) {
                console.log("Retrying upload...");
                resolve(uploadWithRetry(retries - 1));
              } else {
                let message = "Erro no upload: " + error.message;
                if (error.code === 'storage/retry-limit-exceeded') {
                  message = "A ligação falhou repetidamente. Verifica a tua internet ou tenta um ficheiro mais pequeno.";
                }
                alert(message);
                setIsUpdating(false);
                reject(error);
              }
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              await updateDoc(doc(db, 'users', user.uid), {
                avatar: downloadURL
              });
              setIsUpdating(false);
              setUploadProgress(0);
              resolve();
            }
          );
        });
      };

      await uploadWithRetry();
    } catch (error) {
      console.error("Error updating image:", error);
      setIsUpdating(false);
    }
  };

  return (
    <div className="pb-24 relative overflow-hidden">
      <div className="absolute top-6 left-6 z-30">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] glass px-3 py-2 rounded-xl border border-white/5">
          <ChevronLeft size={16} />
          Voltar
        </button>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
        <Trophy size={400} />
      </div>

      <div className="relative min-h-[20rem] py-12 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/20 to-transparent" />
        <div className="relative z-10 text-center space-y-4 w-full px-6">
          <div className="relative mx-auto w-28 h-28 group">
            <div className="relative w-full h-full">
              <img 
                src={user.avatar || `https://ui-avatars.com/api/?name=${user.nome}&background=FF8C00&color=fff`}
                alt={user.nome}
                className={`w-full h-full rounded-full object-cover border-4 border-accent shadow-2xl transition-all ${isEditing ? 'opacity-50 cursor-pointer' : ''}`}
                referrerPolicy="no-referrer"
                onClick={handleImageClick}
              />
              {isUpdating && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 w-full bg-accent transition-all duration-300" 
                    style={{ height: `${uploadProgress}%` }}
                  />
                  <span className="relative z-10 text-[10px] font-black">{Math.round(uploadProgress)}%</span>
                </div>
              )}
            </div>
            {isEditing && !isUpdating && (
              <div 
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={handleImageClick}
              >
                <Camera size={32} className="text-white drop-shadow-lg" />
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange} 
            />
            {user.isPro && !isEditing && (
              <div className="absolute bottom-1 right-1 bg-accent text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg border-2 border-[#0A0F1C]">
                PRO
              </div>
            )}
          </div>

          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-3 max-w-xs mx-auto">
                <input 
                  type="text" 
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Teu Nome"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center font-bold focus:outline-none focus:border-accent transition-all"
                />
                <input 
                  type="text" 
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Teu Bairro"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center text-sm focus:outline-none focus:border-accent transition-all"
                />
                <input 
                  type="text" 
                  value={localizacao}
                  onChange={(e) => setLocalizacao(e.target.value)}
                  placeholder="Cidade / Localização"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center text-sm focus:outline-none focus:border-accent transition-all"
                />
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Fala sobre ti..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center text-sm focus:outline-none focus:border-accent transition-all min-h-[80px]"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="flex-1 bg-accent text-white font-bold py-3 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                  >
                    {isUpdating && uploadProgress === 0 ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                    Guardar
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    disabled={isUpdating}
                    className="flex-1 bg-white/5 text-white font-bold py-3 rounded-2xl text-[10px] uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">{user.nome}</h2>
                  {currentUser && (
                    <button onClick={() => setIsEditing(true)} className="p-2 glass rounded-xl text-white/40 hover:text-accent transition-all">
                      <Edit size={14} />
                    </button>
                  )}
                </div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  {user.bairro || 'Ginga Player'} • {user.localizacao || 'Luanda, AO'}
                </p>
                {user.bio && (
                  <p className="text-white/60 text-xs italic max-w-xs mx-auto px-4 mt-2">"{user.bio}"</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6 relative z-10">
        <div className="glass rounded-3xl p-6 flex justify-around items-center text-center">
          <div className="space-y-1">
            <p className="text-accent font-bold text-xl">{user.jogos}</p>
            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Jogos</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="space-y-1">
            <p className="text-accent font-bold text-xl">{user.golos}</p>
            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Golos</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="space-y-1">
            <p className="text-accent font-bold text-xl">{user.mvps}</p>
            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">MVPs</p>
          </div>
        </div>

        <div className="space-y-3">
          {user.role === 'admin' && (
            <button 
              onClick={onAdminClick}
              className="w-full glass rounded-2xl p-4 flex items-center justify-between group border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                  <ShieldCheck size={20} />
                </div>
                <span className="font-bold text-sm uppercase tracking-widest">Painel Admin</span>
              </div>
              <ChevronRight size={18} className="text-accent" />
            </button>
          )}

          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-4">Menu do Atleta</p>
          {[
            { icon: Trophy, label: 'Minhas Conquistas' },
            { icon: Star, label: 'Destaque no Topo', badge: '10x' },
            { icon: BarChart3, label: 'Estatísticas Detalhadas' },
            { icon: Video, label: 'Vídeos do Atleta' },
            { icon: Heart, label: 'Sobre o GINGAFUTSAL', onClick: onAboutClick, isSpecial: true }
          ].map((item, i) => (
            <button 
              key={i} 
              onClick={item.onClick}
              className={`w-full glass rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-colors ${item.isSpecial ? 'border-accent/30' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.isSpecial ? 'bg-accent/20 text-accent' : 'bg-accent/10 text-accent'}`}>
                  <item.icon size={20} />
                </div>
                <span className={`font-bold text-sm ${item.isSpecial ? 'text-accent' : ''}`}>{item.label}</span>
              </div>
              <div className="flex items-center gap-3">
                {item.badge && <span className="bg-accent/20 text-accent text-[8px] font-black px-2 py-1 rounded-lg">{item.badge}</span>}
                <ChevronRight size={18} className={`transition-colors ${item.isSpecial ? 'text-accent' : 'text-white/20 group-hover:text-accent'}`} />
              </div>
            </button>
          ))}

          {!user.isPro && (
            <button 
              onClick={onUpgrade}
              className="w-full bg-accent text-white font-bold p-5 rounded-3xl shadow-lg shadow-accent/20 flex items-center justify-between group hover:scale-[1.02] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Star size={20} className="fill-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Seja Atleta PRO</p>
                  <p className="text-[10px] opacity-70">Acesso ilimitado e destaque</p>
                </div>
              </div>
              <ChevronRight size={20} />
            </button>
          )}

          <button 
            onClick={onLogout}
            className="w-full glass rounded-2xl p-4 flex items-center gap-4 text-red-500 mt-6 hover:bg-red-500/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <LogOut size={20} />
            </div>
            <span className="font-bold text-sm uppercase tracking-widest">
              {currentUser ? 'Sair da Conta' : 'Voltar ao Início'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

const MonetizationScreen = ({ onPay, onBack }: { onPay: () => Promise<void>, onBack: () => void }) => {
  const [step, setStep] = useState<'benefits' | 'payment' | 'success'>('benefits');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    await onPay();
    setIsProcessing(false);
    setStep('success');
  };

  if (step === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center space-y-8">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20"
        >
          <CheckCircle2 size={48} className="text-white" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black italic">BEM-VINDO AO PRO!</h2>
          <p className="text-white/60">A tua conta foi atualizada com sucesso. Agora és um Atleta de Elite.</p>
        </div>
        <button 
          onClick={onBack}
          className="w-full bg-accent text-white font-bold py-4 rounded-2xl shadow-lg shadow-accent/20"
        >
          COMEÇAR AGORA
        </button>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div className="px-6 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('benefits')} className="p-2 glass rounded-xl text-white/40">
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <h2 className="text-2xl font-black italic">Pagamento</h2>
        </div>

        <div className="glass rounded-[2.5rem] p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white/40 font-bold text-xs uppercase tracking-widest">Plano Selecionado</span>
              <span className="text-accent font-bold">ATLETA PRO</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-white/40 font-bold text-xs uppercase tracking-widest">Total a Pagar</span>
              <div className="text-right">
                <p className="text-3xl font-black italic">2.500 KZ</p>
                <p className="text-[10px] text-white/20">Pagamento Único / Mensal</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/10">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Método de Pagamento</p>
            <div className="space-y-3">
              <button className="w-full p-4 glass rounded-2xl border border-accent flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                    <CreditCard size={20} />
                  </div>
                  <span className="font-bold text-sm">Multicaixa Express</span>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-accent bg-accent flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </button>
              <button className="w-full p-4 glass rounded-2xl border border-white/10 flex items-center justify-between opacity-50 grayscale">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                    <Zap size={20} />
                  </div>
                  <span className="font-bold text-sm">Unitel Money</span>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-white/20" />
              </button>
            </div>
          </div>

          <button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-accent text-white font-bold py-5 rounded-3xl shadow-lg shadow-accent/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={18} />
                <span>CONFIRMAR PAGAMENTO</span>
              </>
            )}
          </button>
          <p className="text-[10px] text-center text-white/20">Pagamento seguro processado pela GingaPay</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-8 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-accent transition-all text-[10px] font-black uppercase tracking-[0.2em] w-fit">
          <ChevronLeft size={16} />
          Voltar
        </button>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Upgrade <span className="text-accent">PRO</span></h2>
      </div>

      <div className="relative h-48 rounded-[2.5rem] overflow-hidden group">
        <img 
          src="https://picsum.photos/seed/futsal-pro/800/400" 
          className="w-full h-full object-cover" 
          alt="PRO Banner"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-6 left-8 right-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-accent text-white text-[10px] font-black px-2 py-1 rounded-lg">ELITE</div>
            <h3 className="text-xl font-black italic">GINGA PRO</h3>
          </div>
          <p className="text-xs text-white/70">Eleva o teu jogo ao próximo nível com ferramentas exclusivas.</p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-4">Benefícios Exclusivos</p>
        <div className="grid grid-cols-1 gap-3">
          {[
            { icon: Calendar, title: 'Posts Duradouros', desc: 'Os teus lances ficam visíveis por 48h no feed.' },
            { icon: Star, title: 'Destaque no Feed', desc: 'Selo PRO e prioridade na visualização da comunidade.' },
            { icon: User, title: 'Badge de Elite', desc: 'Badge PRO exclusivo no teu perfil e em todos os posts.' },
            { icon: BarChart3, title: 'Scout Detalhado', desc: 'Acesso a todas as tuas estatísticas de jogo.' }
          ].map((benefit, i) => (
            <div key={i} className="glass rounded-2xl p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                <benefit.icon size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm">{benefit.title}</h4>
                <p className="text-[10px] text-white/50 leading-relaxed">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0A0F1C] to-transparent pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <button 
            onClick={() => setStep('payment')}
            className="w-full bg-accent text-white font-bold py-5 rounded-3xl shadow-xl shadow-accent/30 flex items-center justify-between px-8 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <div className="text-left">
              <p className="text-[10px] opacity-70 uppercase font-black">Apenas</p>
              <p className="text-xl font-black italic">2.500 KZ <span className="text-xs font-normal opacity-50">/mês</span></p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black italic">ADERIR</span>
              <ChevronRight size={20} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

const SobreScreen = ({ onBack }: { onBack: () => void }) => {
  const contacts = [
    { icon: Phone, label: 'WhatsApp', value: '923 743 254', color: '#25D366' },
    { icon: Music2, label: 'TikTok', value: '@afonsomilitao', color: '#000000' },
    { icon: Instagram, label: 'Instagram', value: 'afonso_militao', color: '#E1306C' },
    { icon: Facebook, label: 'Facebook', value: 'GINGA Futsal Angola', color: '#1877F2' }
  ];

  return (
    <div className="relative min-h-screen pb-24 overflow-y-auto">
      {/* Background with Arena image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url("Arena.png")' }}
      >
        <div className="absolute inset-0 bg-[#0A0F1C]/85 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 px-6 py-12 max-w-lg mx-auto space-y-8">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/40 hover:text-accent transition-all text-[10px] font-black uppercase tracking-[0.2em] glass px-4 py-3 rounded-2xl border border-white/5 w-fit"
        >
          <ChevronLeft size={18} />
          Voltar
        </button>

        {/* Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass border border-white/10 rounded-2xl p-8 space-y-10 shadow-2xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-white/5 rounded-3xl p-2 mx-auto relative group">
              <img 
                src="logo.png" 
                alt="Logo" 
                className="w-full h-full object-contain drop-shadow-2xl" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://scontent.flad8-1.fna.fbcdn.net/v/t39.30808-6/679992172_122093803274358122_3249315041292680989_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=1d70fc&_nc_ohc=7rp-NwTL0k8Q7kNvwEPNlxP&_nc_oc=AdqWWxfqEPs3JFfD94Z1DKRSw-FhhXJADb3zcfXj4pMUyPkKaOZhM3-xOnj9ZrCQYYo&_nc_zt=23&_nc_ht=scontent.flad8-1.fna&_nc_gid=LKmB6mtfA7iiP9Ivm9apEg&oh=00_Af0lHEhGmWhHnwrfACyaq8ENiHtuqshEXuovRwHIqklb9g&oe=69F02CEB';
                }}
              />
              <div className="absolute inset-0 bg-accent/10 rounded-3xl blur-xl group-hover:bg-accent/20 transition-all opacity-50" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-[1000] italic uppercase tracking-tighter text-white leading-none">GINGA<span className="text-accent">FUTSAL</span></h1>
              <p className="text-[10px] font-bold text-accent uppercase tracking-[0.3em] ml-1">O futuro do futsal angolano</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <div className="w-8 h-1 bg-accent rounded-full" />
            <p className="text-sm text-white/70 leading-relaxed font-medium">
              O GINGAFUTSAL é a plataforma digital que conecta o futsal angolano — ligas, equipas, jogadores e estatísticas — tudo em tempo real. Vive o jogo, acompanha resultados e destaca o teu talento.
            </p>
          </div>

          {/* Developer */}
          <div className="pt-6 border-t border-white/5 space-y-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl overflow-hidden glass border-2 border-accent/20 shadow-xl">
                <img 
                  src="https://scontent.flad8-1.fna.fbcdn.net/v/t39.30808-6/680220769_948144484735415_6920567675912631908_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=13d280&_nc_ohc=F-5Cj3adDTgQ7kNvwH2GcL2&_nc_oc=Adrgg7GBC-S98qiBdT7r9ZKx09GPWT19yfDWPE3HGKEOyLrFsb55V_ZS-450iafSZTU&_nc_zt=23&_nc_ht=scontent.flad8-1.fna&_nc_gid=Y60maeF9GwHK4LZeXCVyjg&oh=00_Af3aKN6HnukANeocrjx1SLB6CT9Ngx3IgqKWdV-wPka-Iw&oe=69EFF7BA" 
                  alt="Afonso Militão" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 className="font-black text-lg uppercase tracking-tight">Afonso Militão</h3>
                <p className="text-[10px] font-black text-accent uppercase tracking-widest leading-none mt-1">Programador & Motion Designer</p>
              </div>
            </div>

            {/* Contacts List */}
            <div className="grid grid-cols-1 gap-3">
              {contacts.map((contact, i) => (
                <a 
                  key={i} 
                  href="#" 
                  className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-white/5 text-white/40 group-hover:text-accent transition-colors">
                      <contact.icon size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">{contact.label}</p>
                      <p className="text-xs font-bold">{contact.value}</p>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-white/10 group-hover:text-accent" />
                </a>
              ))}
            </div>
          </div>

          {/* Developer Brand */}
          <div className="pt-6 border-t border-white/5 space-y-4">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-center">Marca do Desenvolvedor</p>
            <div className="p-6 glass rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center transform hover:scale-105 transition-all">
                <img 
                  src="https://scontent.flad8-1.fna.fbcdn.net/v/t39.30808-6/679213198_948157634734100_9198553310191929015_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=13d280&_nc_ohc=4ekd-JyeqAIQ7kNvwHyHFDu&_nc_oc=AdoAUGSozmFSPa_osO4ZV8mNdQ9EO6zsO_2RWYVpSis1HtVW_1MSxLk8iYRFOeDhJvg&_nc_zt=23&_nc_ht=scontent.flad8-1.fna&_nc_gid=StMmD-XuSCUdxPIWASaHoA&oh=00_Af3c3BYc3vt6r1kuPbPjMX2IqAnVjCVv_WYvRB5Vql3-4A&oe=69F02DB1" 
                  alt="Brand" 
                  className="max-h-16 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
            </div>
          </div>

          {/* Version & Actions */}
          <div className="pt-6 border-t border-white/5 space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Versão da App</span>
              <span className="bg-accent/10 text-accent text-[10px] font-black px-3 py-1 rounded-full">v1.0</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button className="bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase py-4 rounded-2xl transition-all flex items-center justify-center gap-2 tracking-widest border border-white/5">
                <Share2 size={16} />
                Partilhar
              </button>
              <button className="bg-accent text-white font-black text-[10px] uppercase py-4 rounded-2xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2 tracking-widest hover:scale-105 active:scale-95">
                <Star size={16} fill="white" />
                Avaliar
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-[9px] font-medium text-white/20 text-center uppercase tracking-widest pt-4">
            © 2026 Afonso Militão. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

const RankingScreen = ({ posts, onBack }: { posts: Post[], onBack: () => void }) => {
  const [filter, setFilter] = useState<'dia' | 'semana'>('dia');
  
  const sortedPosts = [...posts].sort((a, b) => b.likes - a.likes);
  
  return (
    <div className="px-6 py-8 space-y-8 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-accent transition-all text-[10px] font-black uppercase tracking-[0.2em] w-fit">
          <ChevronLeft size={16} />
          Voltar
        </button>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Ranking <span className="text-accent">Ginga</span></h2>
      </div>

      <div className="flex gap-2 p-1 glass rounded-2xl">
        <button 
          onClick={() => setFilter('dia')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${filter === 'dia' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-white/40'}`}
        >
          HOJE
        </button>
        <button 
          onClick={() => setFilter('semana')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${filter === 'semana' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-white/40'}`}
        >
          ESTA SEMANA
        </button>
      </div>

      <div className="space-y-4">
        {sortedPosts.slice(0, 10).map((post, i) => (
          <div key={post.id} className="glass rounded-3xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black italic text-lg ${i === 0 ? 'bg-accent text-white' : i === 1 ? 'bg-slate-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-white/5 text-white/40'}`}>
                {i + 1}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-accent/20 overflow-hidden">
                  <img src={post.avatar} alt={post.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="font-bold text-sm">{post.nome}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">{post.bairro}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-accent">
                <Heart size={14} className="fill-accent" />
                <span className="font-black italic">{post.likes}</span>
              </div>
              <p className="text-[8px] text-white/20 font-bold uppercase">Likes</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ConviteScreen = ({ onBack }: { onBack: () => void }) => {
  const referralCode = "GINGA-" + Math.random().toString(36).substring(7).toUpperCase();
  
  const handleInvite = () => {
    const text = encodeURIComponent(`Vem jogar no GingaFutsal comigo! Usa o meu código ${referralCode} e ganha destaque no feed. 🔥\n\nDescarrega aqui: ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="px-6 py-8 space-y-8 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-accent transition-all text-[10px] font-black uppercase tracking-[0.2em] w-fit">
          <ChevronLeft size={16} />
          Voltar
        </button>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Convidar <span className="text-accent">Amigos</span></h2>
      </div>

      <div className="glass rounded-[2.5rem] p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto text-accent">
          <Users size={48} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black italic">TRAZ A TUA EQUIPA</h3>
          <p className="text-xs text-white/60 leading-relaxed">
            Convida os teus amigos para o GingaFutsal. Por cada amigo que se registar, ganhas 1 dia de destaque PRO grátis!
          </p>
        </div>

        <div className="p-4 bg-white/5 rounded-2xl border border-dashed border-white/20">
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">O Teu Código</p>
          <p className="text-2xl font-black italic tracking-widest text-accent">{referralCode}</p>
        </div>

        <button 
          onClick={handleInvite}
          className="w-full bg-accent text-white font-bold py-5 rounded-3xl shadow-lg shadow-accent/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Share2 size={20} />
          <span>ENVIAR CONVITE WHATSAPP</span>
        </button>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-4">Como Funciona?</p>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Partilha o teu código com os teus amigos.' },
            { step: '2', text: 'Eles registam-se na app usando o teu código.' },
            { step: '3', text: 'Tu ganhas benefícios PRO automaticamente!' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-4 glass rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-accent">
                {item.step}
              </div>
              <p className="text-xs text-white/70">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Admin Modal Component (Standalone) ---
const AdminModal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0A0F1C] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black italic uppercase text-accent tracking-tighter">{title}</h3>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl hover:text-accent transition-colors">
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

const AdminScreen = ({ onBack, currentUser }: { onBack: () => void, currentUser: UserProfile | null }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'users' | 'copas'>('posts');
  const [activeCopasTab, setActiveCopasTab] = useState<'ligas' | 'equipas' | 'jogadores' | 'jogos'>('ligas');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLeagueId, setFilterLeagueId] = useState('');
  const [filterJornada, setFilterJornada] = useState<number | ''>('');

  // Copas Management State
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  
  // Forms
  const [showAddLeague, setShowAddLeague] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [newLeague, setNewLeague] = useState({ 
    nome: '', 
    regiao: '', 
    logo: '', 
    temporada: '',
    modoCompeticao: 'liga' as 'liga' | 'grupos'
  });
  
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState({ 
    nome: '', 
    ligaId: '', 
    logo: '', 
    cidade: '', 
    descricao: '',
    grupo: '' as string,
    ajustePontos: 0,
    ajusteGM: 0,
    ajusteGS: 0
  });

  const [showAssignTeam, setShowAssignTeam] = useState(false);
  const [assignTeamData, setAssignTeamData] = useState({ equipaId: '', competicaoId: '', grupo: '' });

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<LeaguePlayer | null>(null);
  const [newPlayer, setNewPlayer] = useState({ nome: '', posicao: 'ALA', numero: 10, equipaId: '', golos: 0, assistencias: 0, foto: '' });

  const [showAddMatch, setShowAddMatch] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [newMatch, setNewMatch] = useState({ 
    equipaA: '', equipaB: '', equipaAId: '', equipaBId: '', 
    golosA: 0, golosB: 0, tempo: '00:00', status: 'agendado' as any,
    ligaId: '', liga: '', jornada: 1, grupo: '',
    data: '', hora: '', local: '', campo: '',
    tempoAtual: 0, tempoMaximo: 40, estadoTempo: 'nao_iniciado' as any
  });

  useEffect(() => {
    setIsLoading(true);
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'posts'));

    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setIsLoading(false);
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied listening to users list (guest mode)");
        setIsLoading(false);
      } else {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    });

    const qLeagues = query(collection(db, 'leagues'), orderBy('nome', 'asc'));
    const unsubscribeLeagues = onSnapshot(qLeagues, (snapshot) => {
      setLeagues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as League)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'leagues'));

    const qTeams = query(collection(db, 'teams'), orderBy('nome', 'asc'));
    const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'teams'));

    const qLeaguePlayers = query(collection(db, 'league_players'), orderBy('nome', 'asc'));
    const unsubscribeLeaguePlayers = onSnapshot(qLeaguePlayers, (snapshot) => {
      setLeaguePlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaguePlayer)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'league_players'));

    const qMatches = query(collection(db, 'matches'), orderBy('data', 'desc'));
    const unsubscribeMatches = onSnapshot(qMatches, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'matches'));

    const qParticipations = query(collection(db, 'participations'));
    const unsubscribeParticipations = onSnapshot(qParticipations, (snapshot) => {
      setParticipations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participation)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'participations'));

    return () => {
      unsubscribePosts();
      unsubscribeUsers();
      unsubscribeLeagues();
      unsubscribeTeams();
      unsubscribeLeaguePlayers();
      unsubscribeMatches();
      unsubscribeParticipations();
    };
  }, []);

  const filteredPosts = posts.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.bairro.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeagues = leagues
    .filter(l => l.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const filteredTeams = teams
    .filter(t => {
      const matchesSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase());
      
      // HÍBRIDO: Se existir filtro por liga, priorizar participações
      if (filterLeagueId) {
        const participationsDaLiga = participations.filter(p => p.competicaoId === filterLeagueId);
        
        // Se houver participações registradas, usamos apenas elas
        if (participationsDaLiga.length > 0) {
          return matchesSearch && participationsDaLiga.some(p => p.equipaId === t.id);
        }
        
        // Se não houver nenhuma participação registrada (fallback modelo antigo), usamos ligaId
        return matchesSearch && t.ligaId === filterLeagueId;
      }
      
      return matchesSearch;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const filteredPlayers = leaguePlayers
    .filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const team = teams.find(t => t.id === p.equipaId);
      const matchesLeague = !filterLeagueId || team?.ligaId === filterLeagueId;
      return matchesSearch && matchesLeague;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const filteredMatches = matches
    .filter(m => {
      const matchesSearch = 
        m.equipaA.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.equipaB.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLeague = !filterLeagueId || m.ligaId === filterLeagueId;
      const matchesJornada = !filterJornada || m.jornada === filterJornada;
      return matchesSearch && matchesLeague && matchesJornada;
    })
    .sort((a, b) => (a.jornada || 0) - (b.jornada || 0) || (a.timestamp || 0) - (b.timestamp || 0));

  const handleCreateLeague = async () => {
    if (!newLeague.nome || !newLeague.regiao || !currentUser) return;
    try {
      if (editingLeague) {
        await updateDoc(doc(db, 'leagues', editingLeague.id), {
          nome: newLeague.nome,
          regiao: newLeague.regiao,
          logo: newLeague.logo,
          temporada: newLeague.temporada,
          modoCompeticao: newLeague.modoCompeticao
        });
      } else {
        await addDoc(collection(db, 'leagues'), {
          nome: newLeague.nome,
          regiao: newLeague.regiao,
          logo: newLeague.logo || `https://picsum.photos/seed/${newLeague.nome}/200/200`,
          temporada: newLeague.temporada || '2024',
          modoCompeticao: newLeague.modoCompeticao || 'liga',
          createdBy: currentUser.uid
        });
      }
      setNewLeague({ nome: '', regiao: '', logo: '', temporada: '', modoCompeticao: 'liga' });
      setShowAddLeague(false);
      setEditingLeague(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'leagues');
    }
  };

  const handleDeleteItem = async ({ colecao, id, nome, checkAssociations }: { colecao: string; id: string; nome?: string; checkAssociations?: () => string | null }) => {
    const associationError = checkAssociations ? checkAssociations() : null;
    if (associationError) {
      setToast({ message: associationError, type: 'error' });
      return;
    }

    try {
      await deleteDoc(doc(db, colecao, id));
      setToast({ message: `${nome || "Item"} apagado com sucesso ✅`, type: 'success' });
    } catch (error) {
      console.error(error);
      setToast({ message: "Erro ao apagar ❌", type: 'error' });
      handleFirestoreError(error, OperationType.DELETE, `${colecao}/${id}`);
    }
  };

  const handleDeleteLeague = async (id: string) => {
    const league = leagues.find(l => l.id === id);
    handleDeleteItem({
      colecao: 'leagues',
      id,
      nome: league?.nome,
      checkAssociations: () => {
        const hasTeams = teams.some(t => t.ligaId === id);
        const hasMatches = matches.some(m => m.ligaId === id);
        const hasParticipations = participations.some(p => p.competicaoId === id);
        if (hasTeams || hasMatches || hasParticipations) {
          return "Esta liga possui equipas ou jogos associados. Remova-os primeiro.";
        }
        return null;
      }
    });
  };

  const handleDeleteTeam = async (id: string) => {
    const team = teams.find(t => t.id === id);
    handleDeleteItem({
      colecao: 'teams',
      id,
      nome: team?.nome,
      checkAssociations: () => {
        const hasPlayers = leaguePlayers.some(p => p.equipaId === id);
        const hasMatches = matches.some(m => m.equipaAId === id || m.equipaBId === id);
        const hasParticipations = participations.some(p => p.equipaId === id);
        if (hasPlayers || hasMatches || hasParticipations) {
          return "Esta equipa possui jogadores, participações ou jogos associados. Remova-os primeiro.";
        }
        return null;
      }
    });
  };

  const handleDeletePlayer = async (id: string) => {
    const player = leaguePlayers.find(p => p.id === id);
    handleDeleteItem({
      colecao: 'league_players',
      id,
      nome: player?.nome
    });
  };

  const handleDeleteMatch = async (id: string) => {
    handleDeleteItem({
      colecao: 'matches',
      id,
      nome: "este jogo"
    });
  };

  const handleDeletePost = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    handleDeleteItem({
      colecao: 'posts',
      id: postId,
      nome: post?.nome || "este post"
    });
  };

  const handleCreateTeam = async () => {
    if (!newTeam.nome || !newTeam.ligaId || !currentUser) return;
    try {
      const teamData = {
        nome: newTeam.nome,
        ligaId: newTeam.ligaId,
        logo: newTeam.logo || `https://picsum.photos/seed/${newTeam.nome}/200/200`,
        cidade: newTeam.cidade || 'Luanda',
        descricao: newTeam.descricao || '',
        grupo: newTeam.grupo?.toUpperCase() || null,
        ajustePontos: Number(newTeam.ajustePontos) || 0,
        ajusteGM: Number(newTeam.ajusteGM) || 0,
        ajusteGS: Number(newTeam.ajusteGS) || 0,
        createdBy: currentUser.uid
      };

      if (editingTeam) {
        await updateDoc(doc(db, 'teams', editingTeam.id), teamData);
      } else {
        await addDoc(collection(db, 'teams'), teamData);
      }
      setNewTeam({ 
        nome: '', 
        ligaId: '', 
        logo: '', 
        cidade: '', 
        descricao: '',
        grupo: '',
        ajustePontos: 0,
        ajusteGM: 0,
        ajusteGS: 0
      });
      setShowAddTeam(false);
      setEditingTeam(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'teams');
    }
  };

  const handleCreatePlayer = async () => {
    if (!newPlayer.nome || !newPlayer.equipaId) return;
    try {
      const playerData = {
        nome: newPlayer.nome,
        posicao: newPlayer.posicao,
        numero: newPlayer.numero,
        equipaId: newPlayer.equipaId,
        golos: newPlayer.golos || 0,
        assistencias: newPlayer.assistencias || 0,
        foto: newPlayer.foto || ''
      };

      if (editingPlayer) {
        await updateDoc(doc(db, 'league_players', editingPlayer.id), playerData);
      } else {
        await addDoc(collection(db, 'league_players'), playerData);
      }
      setNewPlayer({ nome: '', posicao: 'ALA', numero: 10, equipaId: '', golos: 0, assistencias: 0, foto: '' });
      setShowAddPlayer(false);
      setEditingPlayer(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'league_players');
    }
  };

  const handleCreateMatch = async () => {
    if (!newMatch.equipaAId || !newMatch.equipaBId || !newMatch.ligaId) return;
    
    if (newMatch.equipaAId === newMatch.equipaBId) {
      alert("As equipas não podem ser iguais.");
      return;
    }

    if (newMatch.golosA < 0 || newMatch.golosB < 0) {
      alert("Resultado inválido. Os golos não podem ser negativos.");
      return;
    }

    const e1 = teams.find(t => t.id === newMatch.equipaAId);
    const e2 = teams.find(t => t.id === newMatch.equipaBId);
    const l = leagues.find(l => l.id === newMatch.ligaId);

    if (!e1 || !e2 || !l) return;

    try {
      let timestamp = Date.now();
      if (newMatch.data && newMatch.hora) {
        timestamp = new Date(`${newMatch.data}T${newMatch.hora}:00`).getTime();
      }

      const matchData = {
        equipaA: e1.nome,
        equipaB: e2.nome,
        equipaAId: e1.id,
        equipaBId: e2.id,
        golosA: newMatch.golosA,
        golosB: newMatch.golosB,
        tempo: newMatch.status === 'agendado' ? '00:00' : newMatch.tempo,
        status: newMatch.status,
        jornada: newMatch.jornada || 1,
        ligaId: l.id,
        liga: l.nome,
        grupo: newMatch.grupo?.toUpperCase() || null,
        data: newMatch.data || (editingMatch ? editingMatch.data : ''),
        hora: newMatch.hora || '',
        local: newMatch.local || '',
        campo: newMatch.campo || '',
        tempoAtual: Number(newMatch.tempoAtual) || 0,
        tempoMaximo: Number(newMatch.tempoMaximo) || 40,
        estadoTempo: newMatch.estadoTempo || 'nao_iniciado',
        eventos: editingMatch?.eventos || [],
        timestamp: timestamp
      };

      if (editingMatch) {
        await updateDoc(doc(db, 'matches', editingMatch.id), matchData);
      } else {
        await addDoc(collection(db, 'matches'), matchData);
      }
      setNewMatch({ 
        equipaA: '', equipaB: '', equipaAId: '', equipaBId: '', 
        golosA: 0, golosB: 0, tempo: '00:00', status: 'agendado',
        ligaId: '', liga: '', jornada: 1, grupo: '',
        data: '', hora: '', local: '', campo: '',
        tempoAtual: 0, tempoMaximo: 40, estadoTempo: 'nao_iniciado'
      });
      setShowAddMatch(false);
      setEditingMatch(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'matches');
    }
  };

  const handleQuickMatchUpdate = async (id: string, updates: Partial<Match>) => {
    try {
      await updateDoc(doc(db, 'matches', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${id}`);
    }
  };

  const handleTogglePro = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isPro: !user.isPro
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleToggleAdmin = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: user.role === 'admin' ? 'user' : 'admin'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleAssignTeam = async () => {
    if (!assignTeamData.equipaId || !assignTeamData.competicaoId) return;
    
    // Prevenção de duplicados
    const alreadyExists = participations.some(p => 
      p.equipaId === assignTeamData.equipaId && 
      p.competicaoId === assignTeamData.competicaoId
    );
    
    if (alreadyExists) {
      alert("Esta equipa já participa nesta competição.");
      return;
    }

    try {
      await addDoc(collection(db, 'participations'), {
        equipaId: assignTeamData.equipaId,
        competicaoId: assignTeamData.competicaoId,
        grupo: assignTeamData.grupo?.toUpperCase() || null,
        criadoEm: Date.now()
      });
      setShowAssignTeam(false);
      setAssignTeamData({ equipaId: '', competicaoId: '', grupo: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'participations');
    }
  };

  const handleRemoveParticipation = async (participationId: string) => {
    console.log("🚀 ID recebido para remoção:", participationId);

    if (!participationId) {
      console.error("❌ ERRO CRÍTICO: participationId está undefined!");
      alert("Erro interno: ID de participação não encontrado.");
      return;
    }

    const participation = participations.find(p => p.id === participationId);
    const team = teams.find(t => t.id === participation?.equipaId);
    
    try {
      console.log("🔥 Apagando no Firestore ID:", participationId);
      
      // Atualização Local Imediata (Optimistic UI)
      setParticipations(prev => prev.filter(p => p.id !== participationId));
      
      await deleteDoc(doc(db, 'participations', participationId));
      setToast({ message: `Equipa "${team?.nome || ''}" removida da competição com sucesso ✅`, type: 'success' });
      
      console.log("✅ Removido com sucesso. Lista local atualizada.");
    } catch (error) {
      console.error("❌ Erro ao remover:", error);
      setToast({ message: "Erro ao remover ❌", type: 'error' });
      
      // Reverter estado local (o onSnapshot fará isso, mas aqui garantimos consistência)
      handleFirestoreError(error, OperationType.DELETE, `participations/${participationId}`);
    }
  };

  const handleToggleHighlight = async (post: Post) => {
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        isPro: !post.isPro
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  return (
    <div className="px-6 py-8 space-y-8 pb-24">
      <div className="flex flex-col gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-accent transition-all text-[10px] font-black uppercase tracking-[0.2em] w-fit">
          <ChevronLeft size={16} />
          Voltar
        </button>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Painel <span className="text-accent">Admin</span></h2>
          <button 
            onClick={() => window.location.reload()} 
            className="p-3 glass rounded-xl text-accent hover:bg-accent/10 transition-colors"
            title="Recarregar App"
          >
            <Zap size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1 glass rounded-2xl overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('posts')}
          className={`flex-1 min-w-[100px] py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'posts' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-white/40'}`}
        >
          POSTS
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex-1 min-w-[100px] py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-white/40'}`}
        >
          UTILIZADORES
        </button>
        <button 
          onClick={() => setActiveTab('copas')}
          className={`flex-1 min-w-[100px] py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'copas' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-white/40'}`}
        >
          COPAS
        </button>
      </div>

      {/* Barra de Ferramentas / Filtros */}
      <div className="space-y-4 glass p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-accent/40" />
          <input 
            type="text" 
            placeholder="Pesquisa global..."
            className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-accent/40 outline-none transition-all placeholder:text-white/20"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus={false}
          />
        </div>

        {activeTab === 'copas' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-white/30 tracking-widest ml-1">Filtrar por Liga</label>
              <select 
                value={filterLeagueId}
                onChange={e => setFilterLeagueId(e.target.value)}
                className="w-full bg-[#0A0F1C] border border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold text-white/60 focus:border-accent outline-none appearance-none"
              >
                <option value="">Todas as Ligas</option>
                {leagues.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-white/30 tracking-widest ml-1">Filtrar Jornada</label>
              <select 
                value={filterJornada}
                onChange={e => setFilterJornada(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full bg-[#0A0F1C] border border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold text-white/60 focus:border-accent outline-none appearance-none"
              >
                <option value="">Todas</option>
                {[...Array(38)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>Jornada {i + 1}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'posts' && (
            filteredPosts.map(post => (
              <div key={post.id} className="glass rounded-3xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5">
                    <img src={post.image || post.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{post.nome}</p>
                    <p className="text-[10px] text-white/40 truncate">{post.bairro}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleToggleHighlight(post)}
                    className={`p-3 rounded-xl transition-all ${post.isPro ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/20'}`}
                    title={post.isPro ? 'Remover Destaque' : 'Destacar Post'}
                  >
                    <Star size={18} className={post.isPro ? 'fill-accent' : ''} />
                  </button>
                  <button 
                    onClick={() => handleDeletePost(post.id)}
                    className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}

          {activeTab === 'users' && (
            filteredUsers.map(u => (
              <div key={u.uid} className="glass rounded-3xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent/20">
                      <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.nome}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{u.nome}</p>
                      <p className="text-[10px] text-white/40">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {u.role === 'admin' && (
                      <div className="p-1 bg-accent/20 text-accent rounded-lg">
                        <ShieldCheck size={16} />
                      </div>
                    )}
                    {u.isPro && (
                      <div className="p-1 bg-yellow-500/20 text-yellow-500 rounded-lg">
                        <Star size={16} className="fill-yellow-500" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <button 
                    onClick={() => handleTogglePro(u)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${u.isPro ? 'bg-yellow-500/10 text-yellow-500' : 'bg-white/5 text-white/40'}`}
                  >
                    {u.isPro ? 'Remover PRO' : 'Tornar PRO'}
                  </button>
                  <button 
                    onClick={() => handleToggleAdmin(u)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${u.role === 'admin' ? 'bg-accent/10 text-accent' : 'bg-white/5 text-white/40'}`}
                  >
                    {u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                  </button>
                </div>
              </div>
            ))
          )}

          {activeTab === 'copas' && (
            <div className="space-y-6">
              {/* Copas Sub-Tabs */}
              <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'ligas', label: 'Ligas', icon: Trophy },
                  { id: 'equipas', label: 'Equipas', icon: ShieldCheck },
                  { id: 'jogadores', label: 'Jogadores', icon: Users },
                  { id: 'jogos', label: 'Jogos', icon: Video },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCopasTab(tab.id as any)}
                    className={`flex-1 min-w-[70px] py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex flex-col items-center gap-1 ${activeCopasTab === tab.id ? 'bg-accent/20 text-accent' : 'text-white/30'}`}
                  >
                    <tab.icon size={12} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Ligas Management */}
              {activeCopasTab === 'ligas' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                       <Trophy size={14} className="text-accent" />
                       <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Gestão de Ligas</h3>
                    </div>
                    <button 
                      onClick={() => { setShowAddLeague(true); setEditingLeague(null); setNewLeague({ nome: '', regiao: '', logo: '', temporada: '' }); }} 
                      className="bg-accent text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-accent/20 flex items-center gap-2"
                    >
                      <Plus size={14} />
                      Nova Liga
                    </button>
                  </div>

                  <AdminModal 
                    isOpen={showAddLeague} 
                    onClose={() => { setShowAddLeague(false); setEditingLeague(null); }}
                    title={editingLeague ? 'Editar Liga' : 'Nova Liga'}
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Nome da Liga</label>
                        <input 
                          type="text" placeholder="Ex: Girabola Futsal" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none"
                          value={newLeague.nome} onChange={e => setNewLeague({...newLeague, nome: e.target.value})}
                          autoFocus={false}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Região</label>
                          <input 
                             type="text" placeholder="Luanda" 
                             className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none"
                             value={newLeague.regiao} onChange={e => setNewLeague({...newLeague, regiao: e.target.value})}
                             autoFocus={false}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Temporada</label>
                          <input 
                            type="text" placeholder="2024" 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none"
                            value={newLeague.temporada} onChange={e => setNewLeague({...newLeague, temporada: e.target.value})}
                            autoFocus={false}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Modo de Competição</label>
                        <select 
                          className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-accent outline-none"
                          value={newLeague.modoCompeticao} onChange={e => setNewLeague({...newLeague, modoCompeticao: e.target.value as any})}
                        >
                          <option value="liga">📊 LIGA (TABELA ÚNICA)</option>
                          <option value="grupos">🏆 GRUPOS (A, B, C...)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase ml-1">URL do Logo</label>
                        <input 
                          type="text" placeholder="https://..." 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none"
                          value={newLeague.logo} onChange={e => setNewLeague({...newLeague, logo: e.target.value})}
                        />
                      </div>
                      <button onClick={handleCreateLeague} className="w-full bg-accent text-white font-bold py-5 rounded-2xl text-xs uppercase shadow-lg shadow-accent/20 mt-4 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        {editingLeague ? 'GUARDAR ALTERAÇÕES' : 'CRIAR LIGA'}
                      </button>
                    </div>
                  </AdminModal>

                  <div className="space-y-3">
                    {filteredLeagues.map(l => (
                      <div key={l.id} className="glass p-5 rounded-[2rem] border border-white/5 flex items-center justify-between gap-4 group hover:border-accent/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center p-2">
                            <img src={l.logo} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <p className="font-black italic text-sm text-white group-hover:text-accent transition-colors">{l.nome}</p>
                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{l.regiao} • {l.temporada}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setEditingLeague(l); setNewLeague({ nome: l.nome, regiao: l.regiao, logo: l.logo || '', temporada: l.temporada || '', modoCompeticao: l.modoCompeticao || 'liga' }); setShowAddLeague(true); }}
                            className="p-3 bg-white/5 text-white/40 rounded-xl hover:text-accent hover:bg-accent/5 transition-all"
                          >
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteLeague(l.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipas Management */}
              {activeCopasTab === 'equipas' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                       <ShieldCheck size={14} className="text-accent" />
                       <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Gestão de Equipas</h3>
                    </div>
                    <button 
                      onClick={() => { 
                        setShowAddTeam(true); 
                        setEditingTeam(null); 
                        setNewTeam({ nome: '', ligaId: '', logo: '', cidade: '', descricao: '', ajustePontos: 0, ajusteGM: 0, ajusteGS: 0 }); 
                      }} 
                      className="bg-accent text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-accent/20 flex items-center gap-2"
                    >
                      <Plus size={14} />
                      Nova Equipa
                    </button>
                  </div>

                  {filterLeagueId && (
                    <div className="glass p-6 rounded-3xl border border-accent/20 space-y-4">
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest">Inscrição em {leagues.find(l => l.id === filterLeagueId)?.nome}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <select 
                          className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-accent outline-none"
                          value={assignTeamData.equipaId}
                          onChange={e => setAssignTeamData({...assignTeamData, equipaId: e.target.value})}
                        >
                          <option value="">Selecionar Equipa</option>
                          {teams
                            .filter(t => !participations.some(p => p.equipaId === t.id && p.competicaoId === filterLeagueId))
                            .map(t => <option key={t.id} value={t.id}>{t.nome}</option>)
                          }
                        </select>
                        <input 
                          type="text" 
                          placeholder="Grupo (opcional)"
                          className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-accent outline-none uppercase"
                          value={assignTeamData.grupo}
                          onChange={e => setAssignTeamData({...assignTeamData, grupo: e.target.value})}
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const data = { ...assignTeamData, competicaoId: filterLeagueId };
                          setAssignTeamData(data);
                          handleAssignTeam();
                        }}
                        className="w-full bg-accent/10 border border-accent/20 text-accent font-bold py-3 rounded-xl text-[10px] uppercase hover:bg-accent hover:text-white transition-all disabled:opacity-50"
                        disabled={!assignTeamData.equipaId}
                      >
                        Adicionar à Competição
                      </button>
                    </div>
                  )}

                  <AdminModal 
                    isOpen={showAddTeam} 
                    onClose={() => { setShowAddTeam(false); setEditingTeam(null); }}
                    title={editingTeam ? 'Editar Equipa' : 'Nova Equipa'}
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Nome da Equipa</label>
                        <input 
                          type="text" placeholder="Ex: G & SM" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none"
                          value={newTeam.nome} onChange={e => setNewTeam({...newTeam, nome: e.target.value})}
                          autoFocus={false}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Liga Associada</label>
                        <select 
                          className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-accent outline-none"
                          value={newTeam.ligaId} onChange={e => setNewTeam({...newTeam, ligaId: e.target.value})}
                        >
                          <option value="">Escolher Liga</option>
                          {leagues.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Cidade</label>
                          <input 
                            type="text" placeholder="Luanda" 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none"
                            value={newTeam.cidade} onChange={e => setNewTeam({...newTeam, cidade: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">URL do Logo</label>
                          <input 
                            type="text" placeholder="https://..." 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none"
                            value={newTeam.logo} onChange={e => setNewTeam({...newTeam, logo: e.target.value})}
                          />
                        </div>
                        {newTeam.ligaId && leagues.find(l => l.id === newTeam.ligaId)?.modoCompeticao === 'grupos' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Grupo (A, B...)</label>
                            <input 
                              type="text" placeholder="Ex: A" 
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none uppercase"
                              value={newTeam.grupo} onChange={e => setNewTeam({...newTeam, grupo: e.target.value})}
                            />
                          </div>
                        )}
                      </div>

                      <div className="pt-2 space-y-3">
                         <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em] ml-1">Ajustes de Pontuação</p>
                         <div className="grid grid-cols-3 gap-2">
                           <div className="space-y-1">
                             <label className="text-[8px] font-bold text-white/30 uppercase ml-1">Pts Extra</label>
                             <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-accent outline-none" value={newTeam.ajustePontos} onChange={e => setNewTeam({...newTeam, ajustePontos: parseInt(e.target.value) || 0})} autoFocus={false} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[8px] font-bold text-white/30 uppercase ml-1">GM Extra</label>
                             <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-accent outline-none" value={newTeam.ajusteGM} onChange={e => setNewTeam({...newTeam, ajusteGM: parseInt(e.target.value) || 0})} autoFocus={false} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[8px] font-bold text-white/30 uppercase ml-1">GS Extra</label>
                             <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-accent outline-none" value={newTeam.ajusteGS} onChange={e => setNewTeam({...newTeam, ajusteGS: parseInt(e.target.value) || 0})} autoFocus={false} />
                           </div>
                         </div>
                      </div>

                      <button onClick={handleCreateTeam} className="w-full bg-accent text-white font-bold py-5 rounded-2xl text-xs uppercase shadow-lg shadow-accent/20 mt-4 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        {editingTeam ? 'GUARDAR ALTERAÇÕES' : 'CRIAR EQUIPA'}
                      </button>
                    </div>
                  </AdminModal>

                  <div className="space-y-3">
                    {filteredTeams.map(t => {
                      const participation = filterLeagueId ? participations.find(p => p.equipaId === t.id && p.competicaoId === filterLeagueId) : null;
                      const league = leagues.find(l => l.id === (participation?.competicaoId || t.ligaId));
                      
                      return (
                        <div key={t.id} className="glass p-5 rounded-[2rem] border border-white/5 flex items-center justify-between gap-4 group hover:border-accent/20 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center p-2">
                              <img src={t.logo} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                              <p className="font-black italic text-sm text-white group-hover:text-accent transition-colors">{t.nome}</p>
                              <div className="flex items-center gap-2">
                                <Trophy size={10} className="text-white/20" />
                                <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                                  {league?.nome || 'Sem Liga'} {participation?.grupo ? `(${participation.grupo})` : t.grupo ? `(${t.grupo})` : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {participation && (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (participation?.id) {
                                    handleRemoveParticipation(participation.id);
                                  } else {
                                    console.error("Participação não encontrada para esta equipa!", t.id);
                                  }
                                }}
                                className="px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5 group/remove shadow-lg shadow-red-900/10"
                                title="Remover da Competição"
                              >
                                <X size={14} className="group-hover/remove:rotate-90 transition-transform duration-300" />
                                <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Sair da Liga</span>
                              </button>
                            )}
                            <button 
                              onClick={() => { 
                                setEditingTeam(t); 
                                setNewTeam({ nome: t.nome, ligaId: t.ligaId, logo: t.logo || '', cidade: t.cidade || '', descricao: t.descricao || '', grupo: t.grupo || '', ajustePontos: t.ajustePontos || 0, ajusteGM: t.ajusteGM || 0, ajusteGS: t.ajusteGS || 0 }); 
                                setShowAddTeam(true); 
                              }}
                              className="p-3 bg-white/5 text-white/40 rounded-xl hover:text-accent hover:bg-accent/5 transition-all"
                            >
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDeleteTeam(t.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Jogadores Management */}
              {activeCopasTab === 'jogadores' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                       <Users size={14} className="text-accent" />
                       <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Gestão de Jogadores</h3>
                    </div>
                    <button 
                      onClick={() => { setShowAddPlayer(true); setEditingPlayer(null); setNewPlayer({ nome: '', posicao: 'ALA', numero: 10, equipaId: '', golos: 0, assistencias: 0, foto: '' }); }} 
                      className="bg-accent text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-accent/20 flex items-center gap-2"
                    >
                      <Plus size={14} />
                      Novo Jogador
                    </button>
                  </div>

                  <AdminModal 
                    isOpen={showAddPlayer} 
                    onClose={() => { setShowAddPlayer(false); setEditingPlayer(null); }}
                    title={editingPlayer ? 'Editar Jogador' : 'Novo Jogador'}
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Nome Completo</label>
                        <input 
                          type="text" placeholder="Ex: Edson da Silva" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none"
                          value={newPlayer.nome} onChange={e => setNewPlayer({...newPlayer, nome: e.target.value})}
                          autoFocus={false}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Nº Camisola</label>
                          <input 
                            type="number" placeholder="10" 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none"
                            value={newPlayer.numero} onChange={e => setNewPlayer({...newPlayer, numero: parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Posição</label>
                          <select 
                            className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-accent outline-none"
                            value={newPlayer.posicao} onChange={e => setNewPlayer({...newPlayer, posicao: e.target.value})}
                          >
                            <option value="GOL">GUARDA-REDES</option>
                            <option value="FIXO">FIXO</option>
                            <option value="ALA">ALA</option>
                            <option value="PIVÔ">PIVÔ</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Equipa</label>
                        <select 
                          className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-accent outline-none"
                          value={newPlayer.equipaId} onChange={e => setNewPlayer({...newPlayer, equipaId: e.target.value})}
                        >
                          <option value="">Escolher Equipa</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Golos</label>
                          <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none" value={newPlayer.golos} onChange={e => setNewPlayer({...newPlayer, golos: parseInt(e.target.value) || 0})} autoFocus={false} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Assistências</label>
                          <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none" value={newPlayer.assistencias} onChange={e => setNewPlayer({...newPlayer, assistencias: parseInt(e.target.value) || 0})} autoFocus={false} />
                        </div>
                      </div>

                      <button onClick={handleCreatePlayer} className="w-full bg-accent text-white font-bold py-5 rounded-2xl text-xs uppercase shadow-lg shadow-accent/20 mt-4 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        {editingPlayer ? 'GUARDAR ALTERAÇÕES' : 'ADICIONAR JOGADOR'}
                      </button>
                    </div>
                  </AdminModal>

                  <div className="space-y-3">
                    {filteredPlayers.map(p => (
                      <div key={p.id} className="glass p-5 rounded-[2rem] border border-white/5 flex items-center justify-between gap-4 group hover:border-accent/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center font-black italic text-accent text-lg border border-accent/20">
                            {p.numero}
                          </div>
                          <div>
                            <p className="font-black italic text-sm text-white group-hover:text-accent transition-colors">{p.nome}</p>
                            <div className="flex items-center gap-2">
                               <ShieldCheck size={10} className="text-white/20" />
                               <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{p.posicao} • {teams.find(t => t.id === p.equipaId)?.nome || 'Sem Equipa'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setEditingPlayer(p); setNewPlayer({ nome: p.nome, posicao: p.posicao, numero: p.numero, equipaId: p.equipaId, golos: p.golos || 0, assistencias: p.assistencias || 0, foto: p.foto || '' }); setShowAddPlayer(true); }}
                            className="p-3 bg-white/5 text-white/40 rounded-xl hover:text-accent hover:bg-accent/5 transition-all"
                          >
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeletePlayer(p.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Jogos Management */}
              {activeCopasTab === 'jogos' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                       <Video size={14} className="text-accent" />
                       <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Gestão de Jogos</h3>
                    </div>
                    <button 
                      onClick={() => { setShowAddMatch(true); setEditingMatch(null); setNewMatch({ equipaA: '', equipaB: '', equipaAId: '', equipaBId: '', golosA: 0, golosB: 0, tempo: '00:00', status: 'AGENDADO', ligaId: '', liga: '', jornada: 1, data: '', hora: '', local: '' }); }} 
                      className="bg-accent text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-accent/20 flex items-center gap-2"
                    >
                      <Plus size={14} />
                      Novo Jogo
                    </button>
                  </div>

                  <AdminModal 
                    isOpen={showAddMatch} 
                    onClose={() => { setShowAddMatch(false); setEditingMatch(null); }}
                    title={editingMatch ? 'Editar Jogo' : 'Novo Jogo'}
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Escolher Liga</label>
                        <select 
                          className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-accent outline-none"
                          value={newMatch.ligaId} onChange={e => setNewMatch({...newMatch, ligaId: e.target.value})}
                        >
                          <option value="">Escolher Liga</option>
                          {leagues.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Equipa A</label>
                          <select 
                            className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-accent outline-none"
                            value={newMatch.equipaAId} onChange={e => setNewMatch({...newMatch, equipaAId: e.target.value})}
                          >
                            <option value="">Equipa A</option>
                            {teams.filter(t => !newMatch.ligaId || t.ligaId === newMatch.ligaId).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Equipa B</label>
                          <select 
                            className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-accent outline-none"
                            value={newMatch.equipaBId} onChange={e => setNewMatch({...newMatch, equipaBId: e.target.value})}
                          >
                            <option value="">Equipa B</option>
                            {teams.filter(t => !newMatch.ligaId || t.ligaId === newMatch.ligaId).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Golos A</label>
                          <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none font-black italic" value={newMatch.golosA} onChange={e => setNewMatch({...newMatch, golosA: parseInt(e.target.value) || 0})} autoFocus={false} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Golos B</label>
                          <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none font-black italic" value={newMatch.golosB} onChange={e => setNewMatch({...newMatch, golosB: parseInt(e.target.value) || 0})} autoFocus={false} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Jornada</label>
                          <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none" value={newMatch.jornada} onChange={e => setNewMatch({...newMatch, jornada: parseInt(e.target.value) || 1})} autoFocus={false} />
                        </div>
                        {newMatch.ligaId && leagues.find(l => l.id === newMatch.ligaId)?.modoCompeticao === 'grupos' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Grupo (A, B...)</label>
                            <input 
                              type="text" placeholder="Ex: A" 
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none uppercase" 
                              value={newMatch.grupo} onChange={e => setNewMatch({...newMatch, grupo: e.target.value})}
                              autoFocus={false}
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Status</label>
                        <select className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-accent outline-none" value={newMatch.status} onChange={e => setNewMatch({...newMatch, status: e.target.value as any})}>
                          <option value="agendado">🟡 AGENDADO</option>
                          <option value="ao_vivo">🔴 AO VIVO</option>
                          <option value="finalizado">⚫ FINALIZADO</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Data</label>
                          <input type="date" className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-4 text-xs text-white focus:border-accent outline-none" value={newMatch.data} onChange={e => setNewMatch({...newMatch, data: e.target.value})} autoFocus={false} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Hora</label>
                          <input type="time" className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-4 text-xs text-white focus:border-accent outline-none" value={newMatch.hora} onChange={e => setNewMatch({...newMatch, hora: e.target.value})} autoFocus={false} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Campo / Local</label>
                        <input 
                          type="text" placeholder="Ex: Pavilhão da Cidadela"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none font-bold" 
                          value={newMatch.campo} onChange={e => setNewMatch({...newMatch, campo: e.target.value})}
                          autoFocus={false}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Tempo Máximo (min)</label>
                          <input 
                            type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none font-bold" 
                            value={newMatch.tempoMaximo} onChange={e => setNewMatch({...newMatch, tempoMaximo: parseInt(e.target.value) || 40})}
                            autoFocus={false}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Tempo Atual (min)</label>
                          <input 
                            type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-accent outline-none font-bold" 
                            value={newMatch.tempoAtual} onChange={e => setNewMatch({...newMatch, tempoAtual: parseInt(e.target.value) || 0})}
                            autoFocus={false}
                          />
                        </div>
                      </div>

                      <button onClick={handleCreateMatch} className="w-full bg-accent text-white font-bold py-5 rounded-2xl text-xs uppercase shadow-lg shadow-accent/20 mt-4 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        {editingMatch ? 'GUARDAR RESULTADO' : 'CRIAR JOGO'}
                      </button>
                    </div>
                  </AdminModal>

                  <div className="space-y-8">
                    {/* Group by Liga and Jornada */}
                    {Object.entries(filteredMatches.reduce((acc, m) => {
                      const key = leagues.find(l => l.id === m.ligaId)?.nome || m.liga || 'Sem Liga';
                      if (!acc[key]) acc[key] = {};
                      const jKey = `Jornada ${m.jornada || 1}`;
                      if (!acc[key][jKey]) acc[key][jKey] = [];
                      acc[key][jKey].push(m);
                      return acc;
                    }, {} as Record<string, Record<string, Match[]>>)).map(([liga, jornadas]) => (
                      <div key={liga} className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <Trophy size={14} className="text-accent" />
                          <h4 className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">{liga}</h4>
                        </div>
                        
                        {Object.entries(jornadas).map(([jornada, items]) => (
                          <div key={jornada} className="space-y-3">
                            <div className="flex items-center gap-2 ml-4">
                              <div className="w-1 h-1 bg-white/20 rounded-full" />
                              <h5 className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{jornada}</h5>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                              {items.map(m => {
                                const status = m.status?.toLowerCase() || 'finalizado';
                                const isLive = status === 'ao_vivo' || status === 'ao vivo';
                                const isScheduled = status === 'agendado';
                                return (
                                  <div key={m.id} className="glass p-5 rounded-[2rem] border border-white/5 space-y-4 group hover:border-accent/20 transition-all">
                                    <div className="flex justify-between items-center">
                                      <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isLive ? 'bg-red-500 text-white animate-pulse' : isScheduled ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/10 text-white/40'}`}>
                                        {status.replace('_', ' ')}
                                      </div>
                                      <div className="flex gap-2">
                                        <button onClick={() => { setEditingMatch(m); setNewMatch({ equipaA: m.equipaA, equipaB: m.equipaB, equipaAId: m.equipaAId, equipaBId: m.equipaBId, golosA: m.golosA, golosB: m.golosB, tempo: m.tempo, status: m.status as any, ligaId: m.ligaId, liga: m.liga, jornada: m.jornada || 1, grupo: m.grupo || '', data: m.data || '', hora: m.hora || '', local: m.local || '', campo: m.campo || '', tempoAtual: m.tempoAtual || 0, tempoMaximo: m.tempoMaximo || 40, estadoTempo: m.estadoTempo || 'nao_iniciado' }); setShowAddMatch(true); }} className="p-2 bg-white/5 rounded-lg hover:text-accent transition-colors">
                                          <Edit size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteMatch(m.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors">
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex-1 text-center">
                                        <p className="font-black italic text-[11px] uppercase tracking-tighter truncate leading-none">{m.equipaA}</p>
                                      </div>
                                      <div className="bg-white/5 rounded-2xl px-4 py-2 border border-white/5 shadow-inner flex items-center gap-3">
                                        <span className={`text-xl font-black italic ${isLive ? 'text-white' : 'text-white/30'}`}>{m.golosA ?? 0}</span>
                                        <div className="flex flex-col items-center">
                                          <span className="text-[7px] font-black text-white/10 tracking-[0.2em]">VS</span>
                                          <span className="text-[9px] font-black text-accent italic">{m.hora || m.tempo}</span>
                                        </div>
                                        <span className={`text-xl font-black italic ${isLive ? 'text-white' : 'text-white/30'}`}>{m.golosB ?? 0}</span>
                                      </div>
                                      <div className="flex-1 text-center">
                                        <p className="font-black italic text-[11px] uppercase tracking-tighter truncate leading-none">{m.equipaB}</p>
                                      </div>
                                    </div>

                                    <div className="flex justify-center gap-2 pt-2 border-t border-white/5">
                                      {isLive ? (
                                        <>
                                          <button onClick={() => handleQuickMatchUpdate(m.id, { golosA: (m.golosA || 0) + 1 })} className="px-3 py-2 bg-accent/10 text-accent rounded-xl text-[8px] font-black uppercase">+ GOLO A</button>
                                          <button onClick={() => handleQuickMatchUpdate(m.id, { golosB: (m.golosB || 0) + 1 })} className="px-3 py-2 bg-accent/10 text-accent rounded-xl text-[8px] font-black uppercase">+ GOLO B</button>
                                          <button onClick={() => handleQuickMatchUpdate(m.id, { status: 'finalizado', tempo: 'FIM' })} className="px-3 py-2 bg-white/5 text-white/30 rounded-xl text-[8px] font-black uppercase">Finalizar</button>
                                        </>
                                      ) : isScheduled ? (
                                        <button onClick={() => handleQuickMatchUpdate(m.id, { status: 'ao_vivo', tempo: '0\'' })} className="px-4 py-2 bg-accent text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-2 items-center justify-center w-full">
                                          <PlayCircle size={14} /> INICIAR JOGO
                                        </button>
                                      ) : (
                                        <button onClick={() => handleQuickMatchUpdate(m.id, { status: 'ao_vivo', tempo: 'RECOMEÇO' })} className="px-4 py-2 bg-white/5 text-white/20 rounded-xl text-[9px] font-black uppercase w-full">Reabrir Jogo</button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300 ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
          <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

const NotificationsScreen = ({ notifications, onBack, onMarkAsRead }: { 
  notifications: Notification[], 
  onBack: () => void,
  onMarkAsRead: (id: string) => void
}) => {
  return (
    <div className="px-6 py-8 space-y-8 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-accent transition-all text-[10px] font-black uppercase tracking-[0.2em] w-fit">
          <ChevronLeft size={16} />
          Voltar
        </button>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Notificações</h2>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
              <BellRing size={40} />
            </div>
            <p className="text-white/40 font-bold">Sem notificações por agora</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <motion.div 
              key={notif.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => onMarkAsRead(notif.id)}
              className={`p-5 rounded-[2rem] glass border transition-all cursor-pointer ${notif.isRead ? 'border-white/5 opacity-60' : 'border-accent/30 bg-accent/5 shadow-lg shadow-accent/5'}`}
            >
              <div className="flex gap-4">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10">
                    <img src={notif.avatar || "https://picsum.photos/seed/ginga/100/100"} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#0A0F1C] ${
                    notif.type === 'like' ? 'bg-red-500' : notif.type === 'game' ? 'bg-accent' : 'bg-blue-500'
                  }`}>
                    {notif.type === 'like' && <Heart size={10} className="text-white fill-white" />}
                    {notif.type === 'game' && <Video size={10} className="text-white" />}
                    {notif.type === 'comment' && <MessageCircle size={10} className="text-white" />}
                  </div>
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm">{notif.title}</h4>
                    <span className="text-[8px] font-bold text-white/30 uppercase">{notif.time}</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">{notif.message}</p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-accent rounded-full mt-2" />
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const ReservasScreen = ({ onBack }: { onBack: () => void }) => (
  <div className="px-6 py-6 space-y-8 pb-24">
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-accent transition-all text-[10px] font-black uppercase tracking-[0.2em] w-fit">
        <ChevronLeft size={16} />
        Voltar
      </button>
      <h2 className="text-2xl font-black italic">Reservas</h2>
      <div className="flex justify-between items-center bg-white/5 rounded-2xl p-4 border border-white/5">
        <div className="text-center space-y-1">
          <p className="text-[8px] font-bold text-white/40 uppercase">Maio 2024</p>
          <div className="flex gap-4">
            {[20, 21, 22, 23, 24, 25, 26].map((day) => (
              <div key={day} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${day === 23 ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-white/40'}`}>
                <span className="text-[8px] font-bold uppercase">{['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'][day % 7]}</span>
                <span className="text-sm font-black">{day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div className="space-y-4">
      <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Quadra Disponível</h3>
      <div className="glass rounded-[2.5rem] overflow-hidden relative group">
        <img 
          src="https://images.unsplash.com/photo-1544919982-b61976f0ba43?q=80&w=800&auto=format&fit=crop" 
          alt="Arena Ginga" 
          className="w-full h-48 object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C] via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          <div className="space-y-1">
            <h4 className="text-xl font-black italic">Arena Ginga</h4>
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Cazenga, Luanda</p>
            <div className="flex items-center gap-3 pt-2">
              <span className="text-[8px] font-bold text-white/40 flex items-center gap-1"><Calendar size={10} /> 15:00 - 19:00</span>
              <span className="text-[8px] font-bold text-white/40 flex items-center gap-1"><Star size={10} /> 60 min</span>
            </div>
          </div>
          <div className="text-right space-y-2">
            <p className="text-accent font-black italic text-lg">80.000 Kz</p>
            <button className="bg-accent text-white text-[8px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-lg shadow-accent/20">
              Reservar
            </button>
          </div>
        </div>
      </div>
    </div>

    <div className="space-y-4">
      <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Minhas Reservas</h3>
      <div className="space-y-3">
        {[
          { name: 'Arena Ginga', date: '20 Mai • 19:00', status: 'CONCLUÍDA', color: 'text-green-500' },
          { name: 'Quadra 10X', date: '18 Mai • 17:00', status: 'CANCELADA', color: 'text-red-500' }
        ].map((res, i) => (
          <div key={i} className="glass rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <Trophy size={24} className="text-accent" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">{res.name}</h4>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{res.date}</p>
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest ${res.color}`}>{res.status}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ScoutScreen = ({ players, onBack }: { players: Player[], onBack: () => void }) => {
  const [search, setSearch] = useState('');

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.team.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-6 py-6 space-y-6 pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-accent transition-all text-[10px] font-black uppercase tracking-[0.2em] w-fit">
        <ChevronLeft size={16} />
        Voltar
      </button>
      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
        <input 
          type="text" 
          placeholder="Buscar atletas, equipas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest ml-1">Atletas em Destaque</h3>
        <div className="grid grid-cols-1 gap-3">
          {filteredPlayers.map(player => (
            <div key={player.id} className="glass rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <User size={24} className="text-white/20" />
                </div>
                <div>
                  <h4 className="font-bold">{player.name}</h4>
                  <p className="text-xs text-white/40">{player.pos} • {player.team}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-accent font-bold text-lg">{player.rating}</p>
                <p className="text-[8px] text-white/40 font-bold uppercase">Nota</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MessengerScreen = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="h-full flex flex-col pt-6 pb-24 px-6 bg-transparent relative overflow-hidden">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 glass rounded-xl text-white/40 shadow-lg">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Mensagens</h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center relative z-10">
            <MessageCircle size={48} className="text-accent" />
          </div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute inset-0 bg-accent/30 rounded-full blur-2xl"
          />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-black italic">CONVERSAS PRIVADAS</h3>
          <p className="text-xs text-white/50 max-w-[240px] mx-auto leading-relaxed">
            O sistema de mensagens em tempo real está a ser afinado para o lançamento da GingaFutsal Cloud.
          </p>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 space-y-4 w-full">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
              <Zap size={20} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-accent uppercase tracking-widest leading-none">GINGA CLOUD</p>
              <p className="text-[9px] font-bold text-white/40 uppercase mt-1">Lançamento em Breve</p>
            </div>
          </div>
          <button 
            onClick={() => window.open('https://wa.me/244923743254', '_blank')}
            className="w-full bg-[#25D366] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Phone size={18} />
            <span>FALAR COM SUPORTE</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Track Firestore connection status with a single fetch instead of a continuous stream to save resources
    const checkConnection = async () => {
      try {
        await getDoc(doc(db, 'test', 'connection'));
        setIsFirestoreConnected(true);
      } catch (error: any) {
        if (error.code === 'unavailable' || error.message?.includes('network')) {
          setIsFirestoreConnected(false);
        }
      }
    };
    checkConnection();
    const connectionInterval = setInterval(checkConnection, 30000); // Check every 30s

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectionInterval);
    };
  }, []);
const [isGuest, setIsGuest] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [activeScreen, setActiveScreen] = useState<Screen>('inicio');
  const [headerTitle, setHeaderTitle] = useState(SCREEN_TITLES.inicio);

  useEffect(() => {
    // Reset or update header title whenever activeScreen changes
    setHeaderTitle(SCREEN_TITLES[activeScreen] || SCREEN_TITLES.inicio);
  }, [activeScreen]);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const previousMatchesRef = useRef<Record<string, Match>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [games, setGames] = useState<Match[]>(INITIAL_GAMES as any);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([]);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [players] = useState<Player[]>(INITIAL_PLAYERS);
  const user = currentUser || ({
    uid: 'guest',
    nome: 'Adepto Ginga',
    email: 'guest@gingafutsal.com',
    bairro: 'Luanda, AO',
    jogos: 0,
    golos: 0,
    mvps: 0,
    ranking: 'Bronze',
    isPro: false,
    avatar: `https://ui-avatars.com/api/?name=Adepto&background=333&color=fff&size=100`,
    role: 'user'
  } as UserProfile);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', type: 'like', title: 'Novo Gosto', message: 'O Mauro curtiu o teu lance no Kilamba!', time: 'Agora', isRead: false, avatar: 'https://picsum.photos/seed/mauro/100/100' },
    { id: '2', type: 'game', title: 'Jogo ao Vivo', message: 'O jogo Kilamba FC vs Samba Futsal começou!', time: '5m', isRead: false, avatar: 'https://picsum.photos/seed/game/100/100' },
    { id: '3', type: 'comment', title: 'Novo Comentário', message: 'O Zico comentou: "Que golaço, craque!"', time: '12m', isRead: true, avatar: 'https://picsum.photos/seed/zico/100/100' },
  ]);

  // --- Firebase Listeners ---
  useEffect(() => {
    // Safety timeout for auth readiness
    const timeout = setTimeout(() => {
      if (!isAuthReady) setIsAuthReady(true);
    }, 5000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout);
      
      // Cleanup previous user listener if it exists
      if ((window as any).unsubscribeUser) {
        (window as any).unsubscribeUser();
        (window as any).unsubscribeUser = null;
      }

      if (firebaseUser) {
        // Get user profile from Firestore with retry logic
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        const fetchProfile = async (retries = 3): Promise<void> => {
          try {
            // Real-time listener for user profile
            const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists()) {
                const userData = docSnap.data() as UserProfile;
                const userEmail = firebaseUser.email?.toLowerCase().trim();
                
                // Admin email check
                if (userEmail === "afonsomilitao85@gmail.com") {
                  userData.role = 'admin';
                  localStorage.setItem("isAdmin", "true");
                } else {
                  userData.role = 'user';
                  localStorage.removeItem("isAdmin");
                }
                
                // If we are in "Admin Login" mode and the user is NOT an admin, log them out
                if (showAdminLogin && userData.role !== 'admin') {
                  signOut(auth);
                  alert('Esta área é reservada a administradores. Para utilizadores comuns, o acesso é livre e sem necessidade de conta.');
                  setShowAdminLogin(false);
                  setIsGuest(false);
                  return;
                }

                // If we are in "Admin Login" mode and the user is an admin, redirect them
                if (showAdminLogin && userData.role === 'admin') {
                  setActiveScreen('admin');
                  setShowAdminLogin(false);
                }

                setCurrentUser(userData);
              } else {
                // If the user document doesn't exist, check if it's the admin
                const userEmail = firebaseUser.email?.toLowerCase().trim();
                if (userEmail === "afonsomilitao85@gmail.com") {
                  // Provide a temporary admin profile while Firestore catch up
                  const tempAdmin: UserProfile = {
                    uid: firebaseUser.uid,
                    nome: firebaseUser.displayName || 'Admin Ginga',
                    email: firebaseUser.email || '',
                    bairro: 'Luanda, AO',
                    jogos: 0,
                    golos: 0,
                    mvps: 0,
                    ranking: 'Admin',
                    isPro: true,
                    role: 'admin'
                  };
                  setCurrentUser(tempAdmin);
                  localStorage.setItem("isAdmin", "true");
                  if (showAdminLogin) {
                    setActiveScreen('admin');
                    setShowAdminLogin(false);
                  }
                } else if (showAdminLogin) {
                  signOut(auth);
                  alert("Esta conta não possui perfil administrativo.");
                  setShowAdminLogin(false);
                  setIsGuest(false);
                }
              }
            }, (error) => {
              if (error.code === 'permission-denied') {
                console.warn("Permission denied listening to profile (expected during login transitions)");
              } else {
                handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
              }
            });

            // Store unsubscribe function to cleanup
            (window as any).unsubscribeUser = unsubscribeUser;

            // Try to get document
            let userDoc;
            try {
              userDoc = await getDoc(userRef);
            } catch (e: any) {
              if (e.message?.includes('offline') || e.code === 'unavailable') {
                return;
              }
              throw e;
            }

            if (!userDoc.exists()) {
              const provider = firebaseUser.providerData[0]?.providerId.split('.')[0] || 'password';
              const userEmail = firebaseUser.email?.toLowerCase().trim();
              const newUser: UserProfile = {
                uid: firebaseUser.uid,
                nome: firebaseUser.displayName || 'Atleta Ginga',
                email: firebaseUser.email || '',
                bairro: 'Luanda, AO',
                jogos: 0,
                golos: 0,
                mvps: 0,
                ranking: 'Bronze',
                isPro: false,
                provider: provider,
                createdAt: serverTimestamp(),
                avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName || 'Atleta'}&background=FF8C00&color=fff`,
                role: userEmail === "afonsomilitao85@gmail.com" ? 'admin' : 'user'
              };
              
              try {
                await setDoc(userRef, newUser);
                
                // If we are in "Admin Login" mode and the user is an admin, redirect them
                if (showAdminLogin && newUser.role === 'admin') {
                  setActiveScreen('admin');
                  setShowAdminLogin(false);
                }
                
                setCurrentUser(newUser);
              } catch (error) {
                console.error("Error creating user document:", error);
              }
            }
          } catch (err) {
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              return fetchProfile(retries - 1);
            }
            const userEmail = firebaseUser.email?.toLowerCase().trim();
            const fallbackUser: UserProfile = {
              uid: firebaseUser.uid,
              nome: firebaseUser.displayName || 'Atleta Ginga',
              email: firebaseUser.email || '',
              bairro: 'Luanda, AO',
              jogos: 0,
              golos: 0,
              mvps: 0,
              ranking: 'Bronze',
              isPro: false,
              role: userEmail === "afonsomilitao85@gmail.com" ? 'admin' : 'user'
            };
            setCurrentUser(fallbackUser);
          }
        };

        await fetchProfile();
      } else {
        setCurrentUser(null);
      }
      setIsAuthReady(true);
    });

    // Real-time Posts
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(qPosts, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'posts'));

    // Real-time Matches
    const qMatches = query(collection(db, 'matches'), orderBy('status', 'desc'));
    const unsubscribeMatches = onSnapshot(qMatches, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Match[];
      
      // Toast System for Real-time events
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const matchId = change.doc.id;
          const newData = change.doc.data() as Match;
          const oldData = previousMatchesRef.current[matchId];

          if (oldData) {
            // 1. Início de Jogo
            if (oldData.status?.toLowerCase() === 'agendado' && newData.status?.toLowerCase() === 'ao_vivo') {
              addToast({
                type: 'inicio',
                title: 'JOGO INICIADO! ⚽',
                message: `Começou o duelo entre ${newData.equipaA} e ${newData.equipaB}!`,
                equipaA: newData.equipaA,
                equipaB: newData.equipaB
              });
            }

            // 2. GOLO A
            if (newData.golosA > (oldData.golosA || 0)) {
              addToast({
                type: 'golo',
                title: 'GOLO! ⚽🔥',
                message: `${newData.equipaA} acaba de marcar!`,
                equipaA: newData.equipaA,
                equipaB: newData.equipaB,
                golosA: newData.golosA,
                golosB: newData.golosB
              });
            }

            // 3. GOLO B
            if (newData.golosB > (oldData.golosB || 0)) {
              addToast({
                type: 'golo',
                title: 'GOLO! ⚽🔥',
                message: `${newData.equipaB} acaba de marcar!`,
                equipaA: newData.equipaA,
                equipaB: newData.equipaB,
                golosA: newData.golosA,
                golosB: newData.golosB
              });
            }

            // 4. FIM de Jogo
            if (oldData.status?.toLowerCase() === 'ao_vivo' && newData.status?.toLowerCase() === 'finalizado') {
              addToast({
                type: 'fim',
                title: 'JOGO FINALIZADO! 🏁',
                message: `Resultado final: ${newData.equipaA} ${newData.golosA} - ${newData.golosB} ${newData.equipaB}`,
                equipaA: newData.equipaA,
                equipaB: newData.equipaB,
                golosA: newData.golosA,
                golosB: newData.golosB
              });
            }
          }
        }
      });

      // Update Ref for next comparison
      const newMatchesRecord: Record<string, Match> = {};
      matchesData.forEach(m => {
        newMatchesRecord[m.id] = m;
      });
      previousMatchesRef.current = newMatchesRecord;

      // Check for new live games to notify (Traditional Notification)
      if (games.length > 0 && matchesData.length > games.length) {
        const newGame = matchesData.find(m => !games.some(g => g.id === m.id) && m.status === 'AO VIVO');
        if (newGame) {
          const newNotif: Notification = {
            id: Date.now().toString(),
            type: 'game',
            title: 'Jogo ao Vivo',
            message: `O jogo ${newGame.equipaA} vs ${newGame.equipaB} começou!`,
            time: 'Agora',
            isRead: false,
            avatar: 'https://picsum.photos/seed/game/100/100'
          };
          setNotifications(prev => [newNotif, ...prev]);
        }
      }
      
      if (matchesData.length > 0) setGames(matchesData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'matches'));

    // Real-time Leagues
    const qLeagues = query(collection(db, 'leagues'), orderBy('nome', 'asc'));
    const unsubscribeLeagues = onSnapshot(qLeagues, (snapshot) => {
      const leaguesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as League[];
      setLeagues(leaguesData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'leagues'));

    // Real-time Teams
    const qTeams = query(collection(db, 'teams'), orderBy('nome', 'asc'));
    const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Team[];
      setTeams(teamsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'teams'));

    // Real-time League Players
    const qLeaguePlayers = query(collection(db, 'league_players'), orderBy('nome', 'asc'));
    const unsubscribeLeaguePlayers = onSnapshot(qLeaguePlayers, (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LeaguePlayer[];
      setLeaguePlayers(playersData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'league_players'));

    // Real-time Ads
    const qAds = query(collection(db, 'ads'), orderBy('createdAt', 'desc'));
    const unsubscribeAds = onSnapshot(qAds, (snapshot) => {
      const adsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      if (adsData.length > 0) setProducts(adsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'ads'));

    const qParticipations = query(collection(db, 'participations'));
    const unsubscribeParticipations = onSnapshot(qParticipations, (snapshot) => {
      const participationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participation));
      setParticipations(participationsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'participations'));

    return () => {
      unsubscribeAuth();
      unsubscribePosts();
      unsubscribeMatches();
      unsubscribeLeagues();
      unsubscribeTeams();
      unsubscribeLeaguePlayers();
      unsubscribeAds();
      unsubscribeParticipations();
      if ((window as any).unsubscribeUser) {
        (window as any).unsubscribeUser();
        (window as any).unsubscribeUser = null;
      }
    };
  }, [isAuthReady, showAdminLogin]);

  // --- Migration Logic for Participations ---
  useEffect(() => {
    if (teams.length > 0 && isAuthReady) {
      const migrate = async () => {
        for (const team of teams) {
          if (team.ligaId) {
            const alreadyExists = participations.some(p => p.equipaId === team.id && p.competicaoId === team.ligaId);
            if (!alreadyExists) {
              try {
                await addDoc(collection(db, 'participations'), {
                  equipaId: team.id,
                  competicaoId: team.ligaId,
                  grupo: team.grupo || null,
                  criadoEm: Date.now()
                });
              } catch (error) {
                console.error("Migration error for team", team.id, error);
              }
            }
          }
        }
      };
      migrate();
    }
  }, [teams.length, participations.length, isAuthReady]);

  // Real-time Likes for current user
  useEffect(() => {
    if (!currentUser) {
      setLikedPosts([]);
      return;
    }

    const qLikes = query(collection(db, 'likes'), where('userId', '==', currentUser.uid));
    const unsubscribeLikes = onSnapshot(qLikes, (snapshot) => {
      const likedIds = snapshot.docs.map(doc => doc.data().postId);
      setLikedPosts(likedIds);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'likes'));

    return () => unsubscribeLikes();
  }, [currentUser]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("isAdmin");
    setIsGuest(false);
    setShowAdminLogin(false);
    setActiveScreen('inicio');
  };

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleScreenChange = (newScreen: Screen) => {
    setActiveScreen(newScreen);
  };

  const handleAddProduct = async (productData: Partial<Product>) => {
    if (!currentUser) return;

    const newProduct = {
      authorUid: currentUser.uid,
      title: productData.title || 'Novo Produto',
      price: productData.price || '0 Kz',
      whatsapp: productData.whatsapp || '244900000000',
      img: productData.img || 'product-new',
      isFeatured: productData.isFeatured || false,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'ads'), newProduct);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ads');
    }
  };

  const handleUpgrade = () => {
    setActiveScreen('monetizacao');
  };

  const handleAdminClick = () => {
    setActiveScreen('admin');
  };

  const handleConfirmUpgrade = async () => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        isPro: true
      });
      // State will be updated by onAuthStateChanged listener
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show Welcome Screen if not logged in and not a guest and not showing admin login
  if (!currentUser && !isGuest && !showAdminLogin) {
    return (
      <WelcomeScreen 
        onEnterApp={() => setIsGuest(true)} 
        onAdminLogin={() => setShowAdminLogin(true)} 
      />
    );
  }

  // Show Admin Login if requested
  if (showAdminLogin && !currentUser) {
    return <LoginScreen onBack={() => setShowAdminLogin(false)} />;
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case 'inicio': return <InicioScreen setScreen={handleScreenChange} user={user} />;
      case 'pelada': return <PeladaScreen onBack={() => handleScreenChange('inicio')} />;
      case 'live': return <LiveScreen games={games} onBack={() => handleScreenChange('inicio')} />;
      case 'competicoes': return <CompeticoesScreen leagues={leagues} teams={teams} participations={participations} players={leaguePlayers} matches={games} onBack={() => handleScreenChange('inicio')} />;
      case 'mercado': return <MercadoScreen products={products} onAddProduct={handleAddProduct} user={user} onBack={() => handleScreenChange('inicio')} />;
      case 'perfil': return <PerfilScreen user={user} currentUser={currentUser} onLogout={handleLogout} onUpgrade={handleUpgrade} onAdminClick={handleAdminClick} onAboutClick={() => setActiveScreen('sobre')} onBack={() => handleScreenChange('inicio')} />;
      case 'scout': return <ScoutScreen players={players} onBack={() => handleScreenChange('inicio')} />;
      case 'reservas': return <ReservasScreen onBack={() => handleScreenChange('inicio')} />;
      case 'monetizacao': return <MonetizationScreen onPay={handleConfirmUpgrade} onBack={() => setActiveScreen('perfil')} />;
      case 'ranking': return <RankingScreen posts={posts} onBack={() => setActiveScreen('inicio')} />;
      case 'convite': return <ConviteScreen onBack={() => setActiveScreen('inicio')} />;
      case 'notificacoes': return <NotificationsScreen notifications={notifications} onBack={() => setActiveScreen('inicio')} onMarkAsRead={handleMarkAsRead} />;
      case 'sobre': return <SobreScreen onBack={() => setActiveScreen('perfil')} />;
      case 'messenger': return <MessengerScreen onBack={() => setActiveScreen('inicio')} />;
      case 'admin': {
        const isAdmin = currentUser?.role === 'admin' || localStorage.getItem("isAdmin") === "true";
        if (!isAdmin) {
          setActiveScreen('perfil');
          return null;
        }
        return <AdminScreen onBack={() => setActiveScreen('perfil')} currentUser={currentUser} />;
      }
      default: return <InicioScreen setScreen={handleScreenChange} user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white max-w-lg mx-auto relative shadow-2xl shadow-black flex flex-col">
      <AnimatePresence>
        {(!isOnline || !isFirestoreConnected) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`${!isOnline ? 'bg-red-500' : 'bg-amber-500'} text-white text-[10px] font-bold py-1 px-4 flex items-center justify-center gap-2 z-[100]`}
          >
            <AlertTriangle size={12} />
            {!isOnline ? 'MODO OFFLINE - Sem internet' : 'LIGAÇÃO INSTÁVEL - A tentar ligar ao servidor...'}
          </motion.div>
        )}
      </AnimatePresence>
      {activeScreen !== 'sobre' && activeScreen !== 'messenger' && (
        <Header 
          title={headerTitle || "GINGA FUTSAL"} 
          onChatClick={() => handleScreenChange('messenger')}
          onScoutClick={() => handleScreenChange('scout')}
          onNotificationClick={() => handleScreenChange('notificacoes')}
          hasUnread={notifications.some(n => !n.isRead)}
        />
      )}
      
      <main className="flex-1 relative overflow-y-auto no-scrollbar pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      {activeScreen !== 'sobre' && (
        <Navbar activeScreen={activeScreen} setActiveScreen={handleScreenChange} />
      )}

      {/* Live Toasts Container */}
      <div className="fixed bottom-24 left-0 right-0 z-[100] px-4 pointer-events-none space-y-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className="pointer-events-auto mx-auto max-w-sm"
            >
              <div className="bg-[#0A0F1C] border border-accent/30 rounded-2xl p-4 shadow-2xl flex items-center gap-4 relative overflow-hidden group">
                {/* Accent glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-accent/10 transition-colors" />
                
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-accent bg-accent/10 shrink-0 ${toast.type === 'golo' ? 'animate-bounce' : ''}`}>
                  {toast.type === 'golo' || toast.type === 'inicio' ? <PlayCircle size={24} /> : <Zap size={24} />}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] font-black text-accent uppercase tracking-widest">{toast.title}</h4>
                  <p className="text-xs font-bold text-white/90 leading-tight mt-0.5">{toast.message}</p>
                  {toast.type === 'golo' && (
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-[10px] font-black italic bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase">
                         {toast.equipaA} <span className="text-accent">{toast.golosA}</span> - <span className="text-accent">{toast.golosB}</span> {toast.equipaB}
                       </span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="p-1 text-white/20 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
