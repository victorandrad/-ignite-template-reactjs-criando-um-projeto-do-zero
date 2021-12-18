import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { RichText } from 'prismic-dom';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client';

import { FiUser, FiCalendar, FiClock } from 'react-icons/fi'
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

import { format, parseISO, minutesToHours } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface Content {
  heading: string;
  body: {
    text: string;
  }[];
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const { isFallback } = useRouter();

  if (isFallback) {
    return <h1>Carregando...</h1>;
  }

  function formatDate(date: string) {
    return format(parseISO(date), 'dd MMM yyyy', { locale: ptBR });
  }


  function calculateReadingTime(content: Content[]) {
    const getHeadingWordsPerMinutes = content.reduce((acc, currentValue) => {
      return currentValue.heading.split(/\s+/).length + acc;
    }, 0);

    const getBodyWordsPerMinutes = content.reduce((acc, currentValue) => {
      return RichText.asText(currentValue.body).split(/\s+/).length + acc;
    }, 0);

    const getWordsPerMinutes = Math.ceil(
      (getHeadingWordsPerMinutes + getBodyWordsPerMinutes) / 200
    );

    if (getWordsPerMinutes < 1) {
      return 'Rápida leitura';
    }

    if (getWordsPerMinutes < 60) {
      return `${getWordsPerMinutes} min`;
    }

    return `${minutesToHours(getWordsPerMinutes)} horas`;
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | Spacetraveling</title>
      </Head>

      {post.data.banner
        ? (
          <img
            className={styles.banner}
            src={post.data.banner.url}
            alt="banner"
          />
        )
        : ''}
      <main className={styles.container}>
        <article className={styles.post}>
          <header>
            <h1>{post.data.title}</h1>

            <div className={styles.infoContent}>
              <span>
                <FiCalendar />
                {formatDate(post.first_publication_date)}
              </span>
              <span>
                <FiUser />
                {post.data.author}
              </span>
              <span>
                <FiClock />
                {calculateReadingTime(post.data.content)}
              </span>
            </div>
          </header>
          <section className={styles.postContent}>
            {post.data.content.map(content => (
              <div key={content.heading}>
                <h1>{content.heading}</h1>
                <div
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </div>
            ))}
          </section>
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.slug'],
    }
  );

  const params = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths: params,
    fallback: true,
  };
};

export const getStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {});

  const postResponse = {
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url ?? '',
      },
      author: response.data.author,
      content: response.data.content.map(content => ({
        heading: content.heading,
        body: content.body,
      })),
    },
    uid: response.uid,
    first_publication_date: response.first_publication_date,
  } as Post;

  return {
    props: {
      post: postResponse
    },
    revalidate: 60 * 30
  }
};
