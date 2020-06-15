pipeline {
  agent { label 'master' }
  environment {
    CI = "true"
  }
  stages {
    stage('Initialize') {
      steps {
        echo 'Initializing ...'

        sh 'yarn --version'
      }
    }

    stage('Install dependencies') {
      steps {
        echo 'Installing dependencies ...'
        sh 'yarn'
      }
    }

    stage('Deploy to prouction environment') {      
      environment {
        NODE_ENV = "production"
      }
      steps {
        sh 'yarn start'
      }
    }
  }

  post {
    always {
      echo 'Finished'
    }
  }
}