import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from "next/link";

import { getPrismicClient } from '../services/prismic';
import Prismic from '@prismicio/client';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import { FiUser, FiCalendar } from 'react-icons/fi'
import { format, parseISO } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useState } from 'react';


interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [nextPosts, setNextPosts] = useState<Post[]>(postsPagination.results);
  const [nextPagePosts, setNextPagePosts] = useState<string>(postsPagination.next_page);

  function formatDate(date: string) {
    return format(parseISO(date), 'dd MMM yyyy', { locale: ptBR });
  }

  async function handlePagination() {
    try {
      if (!nextPagePosts) {
        return;
      }

      const postsPage = await fetch(nextPagePosts)
        .then(response => response.json());
      const { results, next_page } = postsPage;

      const posts: Post[] = results.map(
        post => ({
          uid: post.uid,
          data: {
            title: post.data.title,
            subtitle: post.data.subtitle,
            author: post.data.author
          },
          first_publication_date: post.first_publication_date
        } as Post)
      );

      setNextPagePosts(next_page);
      setNextPosts([...nextPosts, ...posts]);
    } catch (err) {
      throw new Error(err);
    }

  }

  return (
    <>
      <Head>
        <title>Home | Spacetraveling</title>
      </Head>

      <main className={styles.container}>
        <div className={styles.posts}>
          {
            nextPosts.map(post => (
              <Link key={post.uid} href={`/post/${post.uid}`}>
                <a>
                  <strong>{post.data.title}</strong>
                  <p>{post.data.subtitle}</p>
                  <div className={styles.infoContent}>
                    <span>
                      <FiCalendar />
                      {formatDate(post.first_publication_date)}
                    </span>
                    <span>
                      <FiUser />
                      {post.data.author}
                    </span>
                  </div>
                </a>
              </Link>
            ))
          }
        </div>

        {nextPagePosts ? (
          <button type="button" onClick={handlePagination}>
            Carregar mais posts
          </button>
        ) : ''}

      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [
      Prismic.predicates.at('document.type', 'post')
    ],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author', 'post.content'],
      pageSize: 1,
    });

  const posts = postsResponse.results.map(
    post => ({
      uid: post.uid,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author
      },
      first_publication_date: post.first_publication_date
    } as Post)
  );

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts,
      } as PostPagination
    },
    revalidate: 60 * 60 * 24
  }
};
