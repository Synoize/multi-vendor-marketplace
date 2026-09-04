import { useState, useEffect, useRef } from "react";
import { Play, X, Clapperboard, Maximize2, Pause } from "lucide-react";
import { useBannerStore } from "@/store/bannerStore";

function getYouTubeId(url = "") {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]+)/,
    /(?:youtu\.be\/)([\w-]+)/,
    /(?:youtube\.com\/embed\/)([\w-]+)/,
    /(?:youtube\.com\/shorts\/)([\w-]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return url.includes("youtube") ? null : url;
}

function isYouTubeUrl(url) {
  return url && (url.includes("youtube.com") || url.includes("youtu.be"));
}

export default function FloatingVideoPlayer({ onClick }) {
  const [videos, setVideos] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const youTubePlayerRef = useRef(null);
  const ytFrameId = "yt-floating-player";

  useEffect(() => {
    useBannerStore
      .getState()
      .fetchVideos()
      .then((list) => {
        setVideos(list);
        if (list.length > 0) {
          setCurrent(list[Math.floor(Math.random() * list.length)]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePlay = (e) => {
    e.stopPropagation();
    setPlaying(true);
  };

  const handlePause = (e) => {
    e.stopPropagation();
    if (youTubePlayerRef.current) {
      youTubePlayerRef.current.stopVideo();
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
    setPlaying(false);
  };

  const handleFullscreen = (e) => {
    e.stopPropagation();
    setIsFullscreen(true);
    if (onClick) onClick();
  };

  useEffect(() => {
    if (playing && current) {
      if (!isYouTubeUrl(current.url)) {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      } else {
        if (youTubePlayerRef.current) {
          youTubePlayerRef.current.playVideo();
        }
      }
    }
  }, [playing, current]);

  useEffect(() => {
    if (!playing || !current || !isYouTubeUrl(current.url)) return;

    const vid = getYouTubeId(current.url);
    const setupYouTubePlayer = () => {
      if (!window.YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        window.onYouTubeIframeAPIReady = () => createYouTubePlayer(vid);
        document.head.appendChild(tag);
      } else {
        createYouTubePlayer(vid);
      }
    };

    const createYouTubePlayer = (videoId) => {
      youTubePlayerRef.current = new window.YT.Player(ytFrameId, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          mute: 1,
          loop: 1,
          playlist: videoId,
        },
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setPlaying(false);
            }
          },
        },
      });
    };

    setupYouTubePlayer();

    return () => {
      if (
        youTubePlayerRef.current &&
        typeof youTubePlayerRef.current.stopVideo === "function"
      ) {
        youTubePlayerRef.current.stopVideo();
        youTubePlayerRef.current = null;
      }
    };
  }, [playing, current]);

  if (loading || !current || videos.length === 0) return null;

  const vid = getYouTubeId(current.url);
  const isYT = isYouTubeUrl(current.url);

  if (collapsed) {
    return (
      <div className="fixed bottom-[72px] md:bottom-4 right-4 z-50 animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-xl hover:bg-primary-600 transition-all duration-300 hover:scale-110"
        >
          <Clapperboard strokeWidth={1.5} className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-[72px] md:bottom-4 right-4 z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700 ease-out"
      style={{ maxWidth: "200px" }}
    >
      <div className="bg-white w-32 md:w-48 h-44 md:h-72 group relative overflow-hidden rounded-xl shadow-2xl border transition-transform duration-300">
        <div
          id={ytFrameId}
          className={`absolute inset-0 w-full h-full ${playing && isYT ? "" : "hidden"}`}
        />
        {playing && !isYT && (
          <video
            ref={videoRef}
            src={current.url}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            loop
            playsInline
          />
        )}
        {!playing && (
          <>
            <img
              src={
                current.thumbnail ||
                (vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : "")
              }
              alt={current.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={handlePlay}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-300 group-hover:scale-110 hover:bg-white"
              >
                <Play className="h-4 w-4 text-primary fill-primary translate-x-0.5" />
              </button>
            </div>
          </>
        )}

        {playing && (
          <button
            onClick={handlePause}
            className="absolute top-1.5 left-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <Pause className="h-3 w-3" />
          </button>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5 pt-6 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-white text-[10px] font-medium line-clamp-2 leading-tight">
            {current.title}
          </p>
        </div>

        <button
          className="absolute top-1.5 right-1.5 z-20"
          onClick={(e) => {
            e.stopPropagation();
            setPlaying(false);
            setCollapsed(true);
          }}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
            <X className="h-3 w-3" />
          </span>
        </button>

        {playing && (
          <button
            className="absolute bottom-1.5 right-1.5 z-20"
            onClick={handleFullscreen}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
              <Maximize2 className="h-4 w-4" />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
